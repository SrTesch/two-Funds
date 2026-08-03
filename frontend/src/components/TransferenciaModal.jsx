import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { X, ArrowRightLeft } from 'lucide-react';

const TransferenciaModal = ({ isOpen, onClose, onTransferenciaDone }) => {
  const [contasMinhas, setContasMinhas] = useState([]);
  const [contasTodas, setContasTodas] = useState([]);
  const [contaOrigemId, setContaOrigemId] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataTransferencia, setDataTransferencia] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchContas();
    }
  }, [isOpen]);

  const fetchContas = async () => {
    try {
      const token = localStorage.getItem('token');
      // Buscar contas do próprio usuário
      const resMinhas = await api.get('/contas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContasMinhas(resMinhas.data);

      // Buscar todas as contas vinculadas à conta conjunta (inclui as do parceiro)
      const resTodas = await api.get('/contas?joint=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContasTodas(resTodas.data);

      if (resMinhas.data.length > 0) {
        setContaOrigemId(resMinhas.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (contaOrigemId === contaDestinoId) {
      setError('A conta de origem e de destino não podem ser iguais.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await api.post('/contas/transferir', {
        conta_origem_id: contaOrigemId,
        conta_destino_id: contaDestinoId,
        valor: parseFloat(valor),
        descricao: descricao || 'Transferência entre contas',
        data_transferencia: dataTransferencia
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onTransferenciaDone) onTransferenciaDone();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao realizar transferência.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setValor('');
    setDescricao('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} 
          onClick={handleClose} 
        />
        <motion.div 
          className="glass"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{ width: '90%', maxWidth: '400px', padding: '24px', position: 'relative', zIndex: 1001, maxHeight: '90vh', overflowY: 'auto' }}
        >
          <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={22} color="var(--primary)" />
            Transferência entre Contas
          </h2>

          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className="input-group">
              <label>Conta de Origem (Sai o dinheiro)</label>
              <select 
                className="input-field" 
                value={contaOrigemId} 
                onChange={(e) => setContaOrigemId(e.target.value)} 
                required
                style={{ appearance: 'none' }}
              >
                <option value="" disabled>Selecione a conta de origem...</option>
                {contasMinhas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Conta de Destino (Entra o dinheiro)</label>
              <select 
                className="input-field" 
                value={contaDestinoId} 
                onChange={(e) => setContaDestinoId(e.target.value)} 
                required
                style={{ appearance: 'none' }}
              >
                <option value="" disabled>Selecione a conta de destino...</option>
                <optgroup label="Minhas Contas">
                  {contasTodas.filter(c => contasMinhas.some(m => m.id === c.id)).map(c => (
                    <option key={c.id} value={c.id} disabled={String(c.id) === String(contaOrigemId)}>
                      {c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Contas do Parceiro / Outros Membros">
                  {contasTodas.filter(c => !contasMinhas.some(m => m.id === c.id)).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} - {c.proprietario_nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="input-group">
              <label>Valor da Transferência (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                className="input-field" 
                value={valor} 
                onChange={(e) => setValor(e.target.value)} 
                placeholder="0.00" 
                required 
              />
            </div>

            <div className="input-group">
              <label>Descrição (Opcional)</label>
              <input 
                type="text" 
                className="input-field" 
                value={descricao} 
                onChange={(e) => setDescricao(e.target.value)} 
                placeholder="Ex: Envio para conta conjunta" 
              />
            </div>

            <div className="input-group">
              <label>Data</label>
              <input 
                type="date" 
                className="input-field" 
                value={dataTransferencia} 
                onChange={(e) => setDataTransferencia(e.target.value)} 
                required 
              />
            </div>

            {error && <div className="error-text mb-4 text-center">{error}</div>}

            <motion.button 
              type="submit" 
              className="btn-primary" 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              disabled={loading}
            >
              {loading ? 'Transferindo...' : 'Confirmar Transferência'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TransferenciaModal;

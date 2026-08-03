import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, CreditCard } from 'lucide-react';

const FaturaRetroativaModal = ({ isOpen, onClose, viewMode, onFaturaAdded }) => {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/faturas/retroativa', {
        descricao: descricao || `Fatura Cartão Anterior (${mesReferencia})`,
        valor: parseFloat(valor),
        mes_referencia: mesReferencia,
        data_vencimento: dataVencimento,
        is_personal: viewMode === 'personal'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onFaturaAdded) onFaturaAdded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar fatura anterior.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDescricao('');
    setValor('');
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
            <CreditCard size={22} color="var(--primary)" />
            Adicionar Fatura Anterior
          </h2>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Cadastre o valor de uma fatura de cartão de crédito pré-existente sem necessidade de lançar os gastos individuais.
          </p>

          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className="input-group">
              <label>Valor Total da Fatura (R$)</label>
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
                placeholder="Ex: Fatura Nubank Julho/2026" 
              />
            </div>

            <div className="input-group">
              <label>Mês de Referência</label>
              <input 
                type="month" 
                className="input-field" 
                value={mesReferencia} 
                onChange={(e) => setMesReferencia(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <label>Data de Vencimento</label>
              <input 
                type="date" 
                className="input-field" 
                value={dataVencimento} 
                onChange={(e) => setDataVencimento(e.target.value)} 
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
              {loading ? 'Salvando...' : 'Salvar Fatura Anterior'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FaturaRetroativaModal;

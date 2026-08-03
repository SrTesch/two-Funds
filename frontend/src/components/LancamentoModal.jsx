import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X } from 'lucide-react';

const LancamentoModal = ({ isOpen, onClose, viewMode, onLancamentoAdded }) => {
  const [tipo, setTipo] = useState('DESPESA');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [totalParcelas, setTotalParcelas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
      fetchContas();
    }
  }, [isOpen]);

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/categorias', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategorias(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/contas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContas(response.data);
      if (response.data.length > 0 && !contaId) {
        setContaId(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/lancamentos', {
        categoria_id: categoriaId,
        conta_id: contaId ? parseInt(contaId) : null,
        descricao,
        valor: parseFloat(valor),
        tipo,
        is_personal: viewMode === 'personal',
        data_lancamento: dataLancamento,
        metodo_pagamento: metodoPagamento,
        total_parcelas: metodoPagamento === 'CREDITO' ? parseInt(totalParcelas) : 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onLancamentoAdded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDescricao('');
    setValor('');
    setCategoriaId('');
    setMetodoPagamento('PIX');
    setTotalParcelas(1);
    setError('');
    onClose();
  };

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo);

  return (
    <AnimatePresence>
      {isOpen && (
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
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Novo Lançamento {viewMode === 'personal' ? 'Pessoal' : 'Conjunto'}</h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button 
                type="button"
                onClick={() => { setTipo('DESPESA'); setCategoriaId(''); }}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: tipo === 'DESPESA' ? '#EF4444' : 'transparent', color: tipo === 'DESPESA' ? 'white' : 'var(--text-muted)', fontWeight: tipo === 'DESPESA' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Despesa
              </button>
              <button 
                type="button"
                onClick={() => { setTipo('RECEITA'); setCategoriaId(''); }}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: tipo === 'RECEITA' ? '#10B981' : 'transparent', color: tipo === 'RECEITA' ? 'white' : 'var(--text-muted)', fontWeight: tipo === 'RECEITA' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Receita
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="input-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" className="input-field" value={valor} onChange={(e) => setValor(e.target.value)} required placeholder="0.00" />
              </div>

              <div className="input-group">
                <label>Descrição</label>
                <input type="text" className="input-field" value={descricao} onChange={(e) => setDescricao(e.target.value)} required placeholder="Ex: Supermercado" />
              </div>

              {tipo === 'DESPESA' && (
                <div className="input-group">
                  <label>Método de Pagamento</label>
                  <select className="input-field" value={metodoPagamento} onChange={(e) => setMetodoPagamento(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="PIX">Pix (Desconto Instantâneo)</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="CREDITO">Cartão de Crédito</option>
                  </select>
                </div>
              )}

              {/* Se for Pix, Débito ou Receita, exibe seletor de Conta Bancária */}
              {(metodoPagamento !== 'CREDITO' || tipo === 'RECEITA') && contas.length > 0 && (
                <div className="input-group">
                  <label>Conta Bancária (Debitada / Creditada)</label>
                  <select className="input-field" value={contaId} onChange={(e) => setContaId(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="">Selecione uma conta bancária...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {metodoPagamento === 'CREDITO' && tipo === 'DESPESA' && (
                <div className="input-group">
                  <label>Parcelas</label>
                  <input type="number" min="1" max="24" className="input-field" value={totalParcelas} onChange={(e) => setTotalParcelas(e.target.value)} required />
                </div>
              )}

              <div className="input-group">
                <label>Categoria</label>
                <select className="input-field" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required style={{ appearance: 'none' }}>
                  <option value="" disabled>Selecione uma categoria...</option>
                  {categoriasFiltradas.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Data</label>
                <input type="date" className="input-field" value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} required />
              </div>

              {error && <div className="error-text mb-4 text-center">{error}</div>}

              <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LancamentoModal;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, Plus, Edit2, Trash2, Check, Landmark, DollarSign } from 'lucide-react';

const BANCOS_PREDEFINIDOS = [
  { id: 'NUBANK', nome: 'Nubank', cor: '#820AD1' },
  { id: 'ITAU', nome: 'Itaú', cor: '#EC7000' },
  { id: 'BRADESCO', nome: 'Bradesco', cor: '#CC092F' },
  { id: 'SANTANDER', nome: 'Santander', cor: '#EC0000' },
  { id: 'INTER', nome: 'Banco Inter', cor: '#FF7A00' },
  { id: 'CAIXA', nome: 'Caixa', cor: '#005CA9' },
  { id: 'C6', nome: 'C6 Bank', cor: '#242424' },
  { id: 'BB', nome: 'Banco do Brasil', cor: '#0038A8' },
  { id: 'OUTROS', nome: 'Outro Banco / Dinheiro', cor: '#0F5132' }
];

const ContasModal = ({ isOpen, onClose, onContasUpdated }) => {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [editingSaldoId, setEditingSaldoId] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState('');

  // Form states
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('NUBANK');
  const [saldoAtual, setSaldoAtual] = useState('');
  const [cor, setCor] = useState('#820AD1');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchContas();
    }
  }, [isOpen]);

  const fetchContas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/contas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContas(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenForm = (conta = null) => {
    setError('');
    if (conta) {
      setEditingConta(conta);
      setNome(conta.nome);
      setBanco(conta.banco);
      setSaldoAtual(conta.saldo_atual);
      setCor(conta.cor || '#0F5132');
    } else {
      setEditingConta(null);
      setNome('');
      setBanco('NUBANK');
      setSaldoAtual('');
      setCor('#820AD1');
    }
    setIsFormOpen(true);
  };

  const handleBancoSelect = (bancoId) => {
    setBanco(bancoId);
    const item = BANCOS_PREDEFINIDOS.find(b => b.id === bancoId);
    if (item) setCor(item.cor);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingConta) {
        await axios.put(`http://localhost:3000/contas/${editingConta.id}`, {
          nome,
          banco,
          cor
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:3000/contas', {
          nome,
          banco,
          saldo_atual: parseFloat(saldoAtual || 0),
          cor
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsFormOpen(false);
      await fetchContas();
      if (onContasUpdated) onContasUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar conta bancária.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarSaldo = async (contaId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/contas/${contaId}/saldo`, {
        saldo_atual: parseFloat(novoSaldo)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingSaldoId(null);
      setNovoSaldo('');
      await fetchContas();
      if (onContasUpdated) onContasUpdated();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao atualizar saldo.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta bancária?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/contas/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchContas();
      if (onContasUpdated) onContasUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover conta bancária.');
    }
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
          onClick={onClose} 
        />
        <motion.div 
          className="glass"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{ width: '90%', maxWidth: '440px', padding: '24px', position: 'relative', zIndex: 1001, maxHeight: '90vh', overflowY: 'auto' }}
        >
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={22} color="var(--primary)" />
            Gerenciar Contas Bancárias
          </h2>

          {!isFormOpen ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Suas contas ativas:</span>
                <button 
                  onClick={() => handleOpenForm(null)}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <Plus size={16} /> Nova Conta
                </button>
              </div>

              {contas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  Nenhuma conta bancária cadastrada. Clique acima para adicionar sua primeira conta!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {contas.map(conta => (
                    <div 
                      key={conta.id} 
                      style={{ 
                        background: 'white', 
                        borderRadius: '12px', 
                        padding: '14px 16px', 
                        borderLeft: `5px solid ${conta.cor || '#0F5132'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{conta.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{conta.banco}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenForm(conta)}
                            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            title="Editar dados"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(conta.id)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--error)' }}
                            title="Excluir conta"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Saldo Atual:</span>

                        {editingSaldoId === conta.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input 
                              type="number"
                              step="0.01"
                              value={novoSaldo}
                              onChange={(e) => setNovoSaldo(e.target.value)}
                              style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '0.9rem' }}
                              placeholder="0.00"
                              autoFocus
                            />
                            <button 
                              onClick={() => handleSalvarSaldo(conta.id)}
                              style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: Number(conta.saldo_atual) >= 0 ? 'var(--primary)' : 'var(--error)' }}>
                              R$ {Number(conta.saldo_atual).toFixed(2).replace('.', ',')}
                            </span>
                            <button 
                              onClick={() => { setEditingSaldoId(conta.id); setNovoSaldo(conta.saldo_atual); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                            >
                              Editar Saldo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: '1rem', marginBottom: '14px', fontWeight: 600 }}>
                {editingConta ? 'Editar Conta Bancária' : 'Cadastrar Nova Conta'}
              </h3>

              <div className="input-group">
                <label>Nome da Conta / Apelido</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: Nubank Principal, Minha Carteira" 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Banco / Instituição</label>
                <select 
                  className="input-field" 
                  value={banco} 
                  onChange={(e) => handleBancoSelect(e.target.value)} 
                  style={{ appearance: 'none' }}
                >
                  {BANCOS_PREDEFINIDOS.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              {!editingConta && (
                <div className="input-group">
                  <label>Saldo Inicial (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-field" 
                    value={saldoAtual} 
                    onChange={(e) => setSaldoAtual(e.target.value)} 
                    placeholder="0.00" 
                  />
                </div>
              )}

              <div className="input-group">
                <label>Cor de Destaque</label>
                <input 
                  type="color" 
                  value={cor} 
                  onChange={(e) => setCor(e.target.value)} 
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer' }} 
                />
              </div>

              {error && <div className="error-text mb-4 text-center">{error}</div>}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  style={{ flex: 1, background: '#E2E8F0', border: 'none', borderRadius: '12px', padding: '12px', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Voltar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Conta'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ContasModal;

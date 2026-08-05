import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Filter, ArrowRightLeft, Landmark, Edit2, Trash2 } from 'lucide-react';
import { parseLocalDate, formatLocalDate } from '../utils/date';
import LancamentoModal from '../components/LancamentoModal';

const Historico = () => {
  const [lancamentos, setLancamentos] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [tipoAba, setTipoAba] = useState('lancamentos'); // 'lancamentos' | 'transferencias'
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('personal');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());

  // Estado para Edição de Lançamento
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const navigate = useNavigate();

  const fetchLancamentos = useCallback(async (isPersonal) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/lancamentos?personal=${isPersonal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLancamentos(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTransferencias = useCallback(async (isJoint) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/contas/transferencias?joint=${isJoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransferencias(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(storedUser);
      if (!user.codigo_cc) {
        navigate('/dashboard');
        return;
      }
      setLoading(true);
      await fetchLancamentos(viewMode === 'personal');
      await fetchTransferencias(viewMode === 'joint');
      setLoading(false);
    };

    fetchData();
  }, [navigate, fetchLancamentos, fetchTransferencias, viewMode]);

  const handleDeleteLancamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/lancamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchLancamentos(viewMode === 'personal');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover lançamento.');
    }
  };

  const handleOpenEdit = (lancamento) => {
    setEditingLancamento(lancamento);
    setIsEditModalOpen(true);
  };

  const filtradosLancamentos = lancamentos.filter(l => {
    const d = parseLocalDate(l.data_lancamento || l.data_vencimento);
    return (d.getMonth() + 1) === Number(filtroMes) && d.getFullYear() === Number(filtroAno);
  });

  const filtradasTransferencias = transferencias.filter(t => {
    const d = parseLocalDate(t.data_transferencia);
    return (d.getMonth() + 1) === Number(filtroMes) && d.getFullYear() === Number(filtroAno);
  });

  if (loading) return null;

  return (
    <div className="app-container" style={{ paddingTop: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Histórico</h1>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
        <button onClick={() => setViewMode('personal')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'personal' ? 'white' : 'transparent', color: viewMode === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'personal' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Pessoal</button>
        <button onClick={() => setViewMode('joint')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'joint' ? 'white' : 'transparent', color: viewMode === 'joint' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'joint' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Conjunta</button>
      </div>

      {/* Sub-abas de Lançamentos x Transferências */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button 
          onClick={() => setTipoAba('lancamentos')}
          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: tipoAba === 'lancamentos' ? 'var(--primary)' : 'white', color: tipoAba === 'lancamentos' ? 'white' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
        >
          Lançamentos
        </button>
        <button 
          onClick={() => setTipoAba('transferencias')}
          style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: tipoAba === 'transferencias' ? 'var(--primary)' : 'white', color: tipoAba === 'transferencias' ? 'white' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
        >
          Transferências
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <Filter size={20} color="var(--text-muted)" />
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="input-field" style={{ padding: '8px', height: 'auto' }}>
          {Array.from({length: 12}).map((_, i) => (
            <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
          ))}
        </select>
        <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className="input-field" style={{ padding: '8px', height: 'auto' }}>
          {[2025, 2026, 2027].map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {tipoAba === 'lancamentos' ? (
          filtradosLancamentos.length === 0 ? (
            <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum lançamento no período selecionado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtradosLancamentos.map((l) => (
                <div key={l.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: l.status === 'PENDENTE' ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: l.tipo === 'RECEITA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: l.tipo === 'RECEITA' ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {l.tipo === 'RECEITA' ? '↓' : '↑'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.descricao}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {l.categoria_nome} • {l.metodo_pagamento} • {formatLocalDate(l.data_lancamento)}
                        {l.usuario_nome && <span style={{ marginLeft: '4px', fontWeight: 600 }}>({l.usuario_nome})</span>}
                      </div>
                      {l.conta_nome && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Landmark size={12} /> {l.conta_nome}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ fontWeight: 600, color: l.tipo === 'RECEITA' ? 'var(--success)' : 'var(--text-main)' }}>
                      {l.tipo === 'RECEITA' ? '+' : '-'} R$ {Number(l.valor).toFixed(2).replace('.', ',')}
                    </div>
                    {l.status === 'PENDENTE' && <span style={{ fontSize: '0.65rem', background: '#F59E0B', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PENDENTE</span>}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button 
                        onClick={() => handleOpenEdit(l)}
                        style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                        title="Editar lançamento"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLancamento(l.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'var(--error)' }}
                        title="Excluir lançamento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filtradasTransferencias.length === 0 ? (
            <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma transferência realizada neste período.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtradasTransferencias.map((t) => (
                <div key={t.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowRightLeft size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.descricao}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.conta_origem_nome} &rarr; {t.conta_destino_nome} • {formatLocalDate(t.data_transferencia)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Por: {t.usuario_nome}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                    R$ {Number(t.valor).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </motion.div>

      {/* Modal de Edição */}
      <LancamentoModal 
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingLancamento(null); }}
        viewMode={viewMode}
        onLancamentoAdded={() => fetchLancamentos(viewMode === 'personal')}
        lancamentoToEdit={editingLancamento}
      />
    </div>
  );
};

export default Historico;

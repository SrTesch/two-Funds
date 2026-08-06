import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { User, CheckCircle, XCircle, Plus, TrendingUp, TrendingDown, DollarSign, Landmark, ArrowRightLeft, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import LancamentoModal from '../components/LancamentoModal';
import ContasModal from '../components/ContasModal';
import TransferenciaModal from '../components/TransferenciaModal';
import CategoriasModal from '../components/CategoriasModal';

import { parseLocalDate } from '../utils/date';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [isContasModalOpen, setIsContasModalOpen] = useState(false);
  const [isTransferenciaModalOpen, setIsTransferenciaModalOpen] = useState(false);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);

  const [viewMode, setViewMode] = useState('personal');
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

  const fetchContas = useCallback(async (isJoint) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/contas?joint=${isJoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContas(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    const isJoint = viewMode === 'joint';
    await fetchLancamentos(viewMode === 'personal');
    await fetchContas(isJoint);
  }, [viewMode, fetchLancamentos, fetchContas]);

  useEffect(() => {
    const fetchDashboard = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!storedUser || !token) {
        navigate('/login');
        return;
      }
      
      try {
        const profileRes = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentUser = profileRes.data;
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));

        if (currentUser.is_admin) {
          const response = await api.get('/admin/pending', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPendingUsers(response.data);
        } else {
          await fetchLancamentos(viewMode === 'personal');
          await fetchContas(viewMode === 'joint');
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    
    fetchDashboard();
  }, [navigate, fetchLancamentos, fetchContas, viewMode]);

  const handleApprove = async (id, approved) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/admin/approve/${id}`, 
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Cálculo Inteligente do Saldo Total e Resumo por Membro
  const membrosMap = {};

  // 1. Mapear saldos das contas bancárias cadastradas
  contas.forEach(c => {
    const propName = c.proprietario_nome || 'Eu';
    if (!membrosMap[propName]) {
      membrosMap[propName] = { temContaBancaria: true, saldoContas: 0, saldoLancamentos: 0 };
    }
    membrosMap[propName].temContaBancaria = true;
    membrosMap[propName].saldoContas += Number(c.saldo_atual);
  });

  // 2. Mapear lançamentos pagos para membros sem conta bancária registrada
  const lancamentosPagos = lancamentos.filter(l => l.status === 'PAGO');
  lancamentosPagos.forEach(l => {
    const propName = l.usuario_nome || 'Eu';
    if (!membrosMap[propName]) {
      membrosMap[propName] = { temContaBancaria: false, saldoContas: 0, saldoLancamentos: 0 };
    }
    const val = Number(l.valor);
    if (l.tipo === 'RECEITA') {
      membrosMap[propName].saldoLancamentos += val;
    } else if (l.tipo === 'DESPESA') {
      membrosMap[propName].saldoLancamentos -= val;
    }
  });

  // 3. Consolidar resumo por proprietário e saldo total somado
  const resumoPorProprietario = {};
  let saldoTotal = 0;

  Object.keys(membrosMap).forEach(propName => {
    const membro = membrosMap[propName];
    const saldoFinalMembro = membro.temContaBancaria ? membro.saldoContas : membro.saldoLancamentos;
    resumoPorProprietario[propName] = saldoFinalMembro;
    saldoTotal += saldoFinalMembro;
  });

  // Lançamentos do Mês Atual (para KPIs e gráficos)
  const lancamentosMesAtual = lancamentos.filter(l => {
    const d = parseLocalDate(l.data_vencimento || l.data_lancamento);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const despesasMes = lancamentosMesAtual.filter(l => l.tipo === 'DESPESA');
  const maiorDespesa = despesasMes.reduce((prev, curr) => (Number(prev.valor) > Number(curr.valor) ? prev : curr), { valor: 0, descricao: 'Nenhuma' });
  const totalFaturaMes = despesasMes.filter(l => l.metodo_pagamento === 'CREDITO').reduce((acc, l) => acc + Number(l.valor), 0);

  // Gastos por membro no mês (quem gastou o que na conta conjunta)
  const gastosPorMembroMes = despesasMes.reduce((acc, curr) => {
    const nomeMembro = curr.usuario_nome || 'Indefinido';
    acc[nomeMembro] = (acc[nomeMembro] || 0) + Number(curr.valor);
    return acc;
  }, {});

  // Gráfico de Categorias (Despesas do Mês)
  const despesasPorCategoria = despesasMes.reduce((acc, curr) => {
    acc[curr.categoria_nome] = (acc[curr.categoria_nome] || 0) + Number(curr.valor);
    return acc;
  }, {});

  const chartData = Object.keys(despesasPorCategoria).map(key => ({
    name: key,
    value: despesasPorCategoria[key]
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#0F5132', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

  return (
    <div className="app-container" style={{ paddingTop: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <img src="/logo.png" alt="Two Funds" style={{ height: '40px', objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user?.cc_nome || 'Two Funds'}</span>
        </div>
        <button onClick={() => setIsLancamentoModalOpen(true)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 81, 50, 0.3)' }}>
          <Plus size={24} />
        </button>
      </header>

      {user?.is_admin ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Solicitações Pendentes (Admin)</h2>
          {pendingUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingUsers.map((pUser) => (
                <div key={pUser.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '50%' }}>
                      <User size={20} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{pUser.nome}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{pUser.login}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApprove(pUser.id, true)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <CheckCircle size={16} /> Aprovar
                    </button>
                    <button onClick={() => handleApprove(pUser.id, false)} style={{ background: 'var(--error)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                      <XCircle size={16} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma solicitação de cadastro pendente no momento.
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {user?.codigo_cc && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button onClick={() => setViewMode('personal')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'personal' ? 'white' : 'transparent', color: viewMode === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'personal' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Pessoal</button>
              <button onClick={() => setViewMode('joint')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'joint' ? 'white' : 'transparent', color: viewMode === 'joint' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'joint' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Conjunta</button>
            </div>
          )}

          {/* Card Saldo em Carteira */}
          <div className="glass" style={{ padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {viewMode === 'joint' ? 'Saldo Total da Conta Conjunta' : 'Saldo Total Pessoal'}
            </h2>
            <div style={{ fontSize: '2.8rem', fontWeight: 700, color: saldoTotal >= 0 ? 'var(--text-main)' : 'var(--error)', margin: '8px 0' }}>
              <span style={{ fontSize: '1.4rem', verticalAlign: 'super', marginRight: '4px' }}>R$</span>
              {Math.abs(saldoTotal).toFixed(2).replace('.', ',')}
            </div>

            {/* Sub-resumo por pessoa na Visão Conjunta */}
            {viewMode === 'joint' && Object.keys(resumoPorProprietario).length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                {Object.entries(resumoPorProprietario).map(([prop, sald]) => (
                  <div key={prop} style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{prop}: </span>
                    <strong style={{ color: Number(sald) >= 0 ? 'var(--primary)' : 'var(--error)' }}>
                      R$ {Number(sald).toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barra de Ações Rápidas (Contas, Transferir, Categorias) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            <button 
              onClick={() => setIsContasModalOpen(true)}
              style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <Landmark size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Minhas Contas</span>
            </button>

            <button 
              onClick={() => setIsTransferenciaModalOpen(true)}
              style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <ArrowRightLeft size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Transferir</span>
            </button>

            <button 
              onClick={() => setIsCategoriasModalOpen(true)}
              style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}
            >
              <Tag size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Categorias</span>
            </button>
          </div>

          {/* Visão de quem gastou o que no Mês (Conta Conjunta) */}
          {viewMode === 'joint' && Object.keys(gastosPorMembroMes).length > 0 && (
            <div className="glass" style={{ padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Gastos por Membro (Mês Atual)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(gastosPorMembroMes).map(([membro, totalGasto]) => (
                  <div key={membro} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{membro}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--error)' }}>
                      - R$ {Number(totalGasto).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards KPIs (Maior Gasto e Fatura Atual) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                <TrendingDown size={18} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>MAIOR GASTO DO MÊS</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>R$ {Number(maiorDespesa.valor).toFixed(2).replace('.', ',')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{maiorDespesa.descricao}</div>
            </div>
            
            <Link to="/cartoes" style={{ textDecoration: 'none' }}>
              <div className="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
                  <DollarSign size={18} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>FATURA ATUAL</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>R$ {totalFaturaMes.toFixed(2).replace('.', ',')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Ver faturas &rarr;</div>
              </div>
            </Link>
          </div>

          {/* Gráfico de Despesas por Categoria */}
          <div className="glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Despesas por Categoria (Mês Atual)</h3>
            {chartData.length > 0 ? (
              <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                Sem despesas no mês.
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* Modais */}
      <LancamentoModal 
        isOpen={isLancamentoModalOpen} 
        onClose={() => setIsLancamentoModalOpen(false)} 
        viewMode={viewMode}
        onLancamentoAdded={refreshAllData}
      />

      <ContasModal 
        isOpen={isContasModalOpen}
        onClose={() => setIsContasModalOpen(false)}
        onContasUpdated={refreshAllData}
        viewMode={viewMode}
      />

      <TransferenciaModal 
        isOpen={isTransferenciaModalOpen}
        onClose={() => setIsTransferenciaModalOpen(false)}
        onTransferenciaDone={refreshAllData}
      />

      <CategoriasModal 
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
        onCategoriasUpdated={refreshAllData}
      />
    </div>
  );
};

export default Dashboard;

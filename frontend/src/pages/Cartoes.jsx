import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, Check, Calendar, Plus } from 'lucide-react';
import FaturaRetroativaModal from '../components/FaturaRetroativaModal';

const Cartoes = () => {
  const [faturas, setFaturas] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('personal');
  const [isRetroativaModalOpen, setIsRetroativaModalOpen] = useState(false);
  const [selectedContaPagamento, setSelectedContaPagamento] = useState({});
  const navigate = useNavigate();

  const fetchFaturas = useCallback(async (isPersonal) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/faturas?personal=${isPersonal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaturas(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/contas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContas(response.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
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
    fetchFaturas(viewMode === 'personal');
    fetchContas();
  }, [navigate, fetchFaturas, fetchContas, viewMode]);

  const handlePagarFaturaMes = async (mesKey, pendentes) => {
    const contaId = selectedContaPagamento[mesKey];
    const lancamentosIds = pendentes.filter(p => p.origem === 'LANCAMENTO' || !p.origem).map(p => p.id);
    const faturasAvulsasIds = pendentes.filter(p => p.origem === 'FATURA_AVULSA').map(p => p.id);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/faturas/pagar', { 
        lancamentos_ids: lancamentosIds,
        faturas_avulsas_ids: faturasAvulsasIds,
        conta_id: contaId ? parseInt(contaId) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Pagamento de fatura efetuado com sucesso!');
      fetchFaturas(viewMode === 'personal');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao pagar fatura.');
    }
  };

  if (loading) return null;

  // Agrupar faturas por Mês/Ano de Vencimento
  const faturasPorMes = faturas.reduce((acc, lanc) => {
    const d = new Date(lanc.data_vencimento);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { pendentes: [], pagos: [] };
    
    if (lanc.status === 'PENDENTE') {
      acc[key].pendentes.push(lanc);
    } else {
      acc[key].pagos.push(lanc);
    }
    return acc;
  }, {});

  const mesesKeys = Object.keys(faturasPorMes).sort(); // Ordena cronologicamente

  return (
    <div className="app-container" style={{ paddingTop: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Cartão de Crédito</h1>
        <button 
          onClick={() => setIsRetroativaModalOpen(true)}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
        >
          <Plus size={16} /> Fatura Anterior
        </button>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
        <button onClick={() => setViewMode('personal')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'personal' ? 'white' : 'transparent', color: viewMode === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'personal' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Pessoal</button>
        <button onClick={() => setViewMode('joint')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'joint' ? 'white' : 'transparent', color: viewMode === 'joint' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'joint' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}>Conjunta</button>
      </div>

      {mesesKeys.length === 0 ? (
        <div className="glass" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Você não possui faturas cadastradas. Clique em "+ Fatura Anterior" caso tenha uma fatura pré-existente!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {mesesKeys.map(mesKey => {
            const { pendentes, pagos } = faturasPorMes[mesKey];
            const totalPendente = pendentes.reduce((acc, l) => acc + Number(l.valor), 0);
            const totalPago = pagos.reduce((acc, l) => acc + Number(l.valor), 0);
            const [ano, mes] = mesKey.split('-');
            const mesStr = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            
            return (
              <motion.div key={mesKey} className="glass" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} color="var(--primary)" />
                    <h3 style={{ textTransform: 'capitalize', fontSize: '1.1rem' }}>{mesStr}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>R$ {(totalPendente + totalPago).toFixed(2).replace('.', ',')}</div>
                    {totalPendente === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Fatura Paga</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>Pendente: R$ {totalPendente.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {[...pendentes, ...pagos].map(l => (
                    <div key={`${l.origem}-${l.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: l.status === 'PAGO' ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {l.status === 'PAGO' ? <Check size={14} color="var(--success)" /> : <CreditCard size={14} color="var(--text-muted)" />}
                        <span>
                          {l.descricao} 
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({l.categoria_nome} - {l.usuario_nome})
                          </span>
                        </span>
                      </div>
                      <span style={{ fontWeight: 600 }}>R$ {Number(l.valor).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                {pendentes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    {contas.length > 0 && (
                      <div className="input-group" style={{ marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.75rem' }}>Debitar Pagamento da Conta:</label>
                        <select 
                          className="input-field" 
                          value={selectedContaPagamento[mesKey] || ''} 
                          onChange={(e) => setSelectedContaPagamento({ ...selectedContaPagamento, [mesKey]: e.target.value })}
                          style={{ padding: '8px 12px', fontSize: '0.85rem', appearance: 'none' }}
                        >
                          <option value="">Nenhuma (Não alterar saldo em conta)</option>
                          {contas.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nome} (Saldo: R$ {Number(c.saldo_atual).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      onClick={() => handlePagarFaturaMes(mesKey, pendentes)}
                      className="btn-primary" 
                      style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'white' }}
                    >
                      Pagar Fatura Total (R$ {totalPendente.toFixed(2).replace('.', ',')})
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <FaturaRetroativaModal 
        isOpen={isRetroativaModalOpen}
        onClose={() => setIsRetroativaModalOpen(false)}
        viewMode={viewMode}
        onFaturaAdded={() => fetchFaturas(viewMode === 'personal')}
      />
    </div>
  );
};

export default Cartoes;

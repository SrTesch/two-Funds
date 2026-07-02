import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Users, Key, PlusCircle, CheckCircle, XCircle } from 'lucide-react';

const JointAccount = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(''); // 'join', 'generate', 'rename'
  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState('');
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const res = await axios.get('http://localhost:3000/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      
      if (res.data.codigo_cc) {
        const reqs = await axios.get('http://localhost:3000/joint/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(reqs.data);
      }
    } catch (err) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3000/joint/join', { codigo_cc: inputCode }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message);
      setMode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao solicitar conexão.');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/joint/generate', { nome: inputName }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Conta conjunta criada!');
      setMode('');
      fetchProfile(); // refresh state
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta.');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/joint/rename', { nome: inputName }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Nome alterado com sucesso!');
      setMode('');
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar nome.');
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/joint/approve/${id}`, { approved }, { headers: { Authorization: `Bearer ${token}` } });
      fetchProfile(); // reload requests
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <motion.div 
      className="app-container" 
      style={{ paddingTop: '20px' }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/profile')} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <ArrowLeft size={24} /> Voltar
        </button>
      </header>

      <motion.div className="glass" style={{ padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Users size={28} color="var(--primary)" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Conta Conjunta</h2>
        </div>

        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="error-text mb-6 text-center">{error}</motion.div>}
          {message && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="success-text mb-6 text-center">{message}</motion.div>}
        </AnimatePresence>

        {user.codigo_cc ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ padding: '16px', background: 'rgba(15, 81, 50, 0.05)', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nome da Conta Conjunta</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>{user.cc_nome}</div>
              <button onClick={() => setMode('rename')} className="link-text" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Editar Nome</button>
            </div>

            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Seu Código de Convite</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '4px', marginTop: '8px' }}>{user.codigo_cc}</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '8px' }}>Compartilhe este código para outros se conectarem à sua conta conjunta.</p>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Solicitações de Entrada</h3>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma solicitação pendente.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.nome}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>@{r.login}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <CheckCircle size={24} color="var(--success)" style={{ cursor: 'pointer' }} onClick={() => handleApprove(r.id, true)} />
                      <XCircle size={24} color="var(--error)" style={{ cursor: 'pointer' }} onClick={() => handleApprove(r.id, false)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!mode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button onClick={() => setMode('join')} className="btn-primary" style={{ background: '#E2E8F0', color: 'var(--text-main)' }}>
                  <Key size={20} /> Entrar com Código Existente
                </button>
                <button onClick={() => setMode('generate')} className="btn-primary">
                  <PlusCircle size={20} /> Gerar Nova Conta Conjunta
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Modals/Forms based on Mode */}
        {mode === 'join' && !user.codigo_cc && (
          <motion.form onSubmit={handleJoin} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="input-group">
              <label>Código do Convite</label>
              <input type="text" className="input-field" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setMode('')} className="btn-primary" style={{ background: '#E2E8F0', color: 'var(--text-main)' }}>Cancelar</button>
              <button type="submit" className="btn-primary">Solicitar Entrada</button>
            </div>
          </motion.form>
        )}

        {mode === 'generate' && !user.codigo_cc && (
          <motion.form onSubmit={handleGenerate} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="input-group">
              <label>Nome da Nova Conta Conjunta</label>
              <input type="text" className="input-field" value={inputName} onChange={(e) => setInputName(e.target.value)} required placeholder="Ex: Família Silva" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setMode('')} className="btn-primary" style={{ background: '#E2E8F0', color: 'var(--text-main)' }}>Cancelar</button>
              <button type="submit" className="btn-primary">Gerar Código</button>
            </div>
          </motion.form>
        )}

        {mode === 'rename' && user.codigo_cc && (
          <motion.form onSubmit={handleRename} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label>Novo Nome</label>
              <input type="text" className="input-field" value={inputName} onChange={(e) => setInputName(e.target.value)} required placeholder="Novo nome..." />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setMode('')} className="btn-primary" style={{ background: '#E2E8F0', color: 'var(--text-main)' }}>Cancelar</button>
              <button type="submit" className="btn-primary">Salvar Nome</button>
            </div>
          </motion.form>
        )}

      </motion.div>
    </motion.div>
  );
};

export default JointAccount;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, CheckCircle, XCircle } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!storedUser || !token) {
        navigate('/login');
        return;
      }
      
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      if (parsedUser.is_admin) {
        try {
          const response = await axios.get('http://localhost:3000/admin/pending', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setPendingUsers(response.data);
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    };
    
    fetchDashboard();
  }, [navigate]);

  const handleApprove = async (id, approved) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/admin/approve/${id}`, 
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingUsers(pendingUsers.filter(u => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'joint'

  if (loading) return null;

  return (
    <div className="app-container" style={{ paddingTop: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <img src="/logo.png" alt="Two Funds" style={{ height: '40px', objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user?.cc_nome || 'Two Funds'}</span>
        </div>
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-main)', textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} />
          </div>
        </Link>
      </header>

      {user?.is_admin ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Solicitações Pendentes (Admin)</h2>
          
          {pendingUsers.length === 0 ? (
            <div className="glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma solicitação no momento.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingUsers.map(u => (
                <div key={u.id} className="glass" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.nome}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>@{u.login}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleApprove(u.id, true)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
                    >
                      <CheckCircle size={28} />
                    </button>
                    <button 
                      onClick={() => handleApprove(u.id, false)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                    >
                      <XCircle size={28} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {user?.codigo_cc && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
              <button 
                onClick={() => setViewMode('personal')}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'personal' ? 'white' : 'transparent', color: viewMode === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'personal' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Pessoal
              </button>
              <button 
                onClick={() => setViewMode('joint')}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: viewMode === 'joint' ? 'white' : 'transparent', color: viewMode === 'joint' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: viewMode === 'joint' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
              >
                Conjunta
              </button>
            </div>
          )}

          <div className="glass" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Resumo {viewMode === 'personal' ? 'Pessoal' : 'Conjunto'}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Suas despesas e receitas em breve aparecerão aqui.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;

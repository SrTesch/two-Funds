import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, LogOut, User, ArrowLeft } from 'lucide-react';

const AVAILABLE_AVATARS = [
  '/avatars/char1.png',
  '/avatars/char2.png',
  '/avatars/char3.png',
  '/avatars/char4.png',
  '/avatars/char5.png',
  '/avatars/char6.png'
];

const Profile = () => {
  const [user, setUser] = useState(null);
  const [nome, setNome] = useState('');
  const [avatar, setAvatar] = useState('');
  const [senha, setSenha] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('http://localhost:3000/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        setNome(response.data.nome);
        setAvatar(response.data.avatar || AVAILABLE_AVATARS[0]);
      } catch (err) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    const token = localStorage.getItem('token');
    try {
      await axios.put('http://localhost:3000/auth/profile', 
        { nome, avatar, senha },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Perfil atualizado com sucesso!');
      setSenha('');
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({ ...storedUser, nome, avatar }));
    } catch (err) {
      setError('Erro ao atualizar perfil.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <motion.div 
      className="app-container" 
      style={{ paddingTop: '20px' }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <ArrowLeft size={24} /> Voltar
        </button>
        <img src="/logo.png" alt="Two Funds" style={{ height: '40px', objectFit: 'contain' }} />
      </header>

      <motion.div
        className="glass"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ padding: '32px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gerenciar Conta</h2>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <LogOut size={20} /> Sair
          </button>
        </div>

        <form onSubmit={handleUpdate}>
          <motion.div 
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label>Nome de Exibição</label>
            <input 
              type="text" 
              className="input-field" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              required 
            />
          </motion.div>

          <motion.div 
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label>Nova Senha</label>
            <input 
              type="password" 
              className="input-field" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="Digite para alterar a senha"
            />
          </motion.div>

          <motion.div 
            className="input-group" style={{ marginTop: '24px' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label>Escolha seu Avatar</label>
            <div className="avatar-grid">
              {AVAILABLE_AVATARS.map((av, index) => (
                <motion.div 
                  key={av} 
                  className={`avatar-item ${avatar === av ? 'selected' : ''}`}
                  onClick={() => setAvatar(av)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + (index * 0.1) }}
                >
                  <img 
                    src={av} 
                    alt="avatar" 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                  />
                  <User size={32} style={{ display: 'none', color: 'var(--text-muted)' }} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Informações da Conta</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Login:</span>
              <span style={{ fontWeight: 600 }}>{user.login}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Conta Conjunta:</span>
              <span style={{ fontWeight: 600 }}>{user.cc_nome || (user.codigo_cc ? user.codigo_cc : 'Individual')}</span>
            </div>
            
            <button type="button" onClick={() => navigate('/joint')} className="btn-primary" style={{ marginTop: '16px', padding: '8px', fontSize: '0.875rem' }}>
              Gerenciar Conta Conjunta
            </button>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="error-text mb-6 text-center"
              >
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="success-text mb-6 text-center"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            type="submit" 
            className="btn-primary mt-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Save size={20} /> Salvar Alterações
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Profile;

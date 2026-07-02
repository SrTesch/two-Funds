import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3000/auth/login', { login, senha });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center' }}>
      <motion.div
        className="glass"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ padding: '32px 24px', textAlign: 'center' }}
      >
        <motion.img 
          src="/logo.png" 
          alt="Two Funds Logo" 
          style={{ width: '120px', height: '120px', objectFit: 'contain', margin: '0 auto 24px' }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        />
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>Bem vindo de volta</h1>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div className="input-group">
            <label>Login</label>
            <input 
              type="text" 
              className="input-field" 
              value={login} 
              onChange={(e) => setLogin(e.target.value)} 
              placeholder="Seu usuário"
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              className="input-field" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>

          {error && <div className="error-text mb-6 text-center">{error}</div>}

          <motion.button 
            type="submit" 
            className="btn-primary mt-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : <><LogIn size={20} /> Entrar</>}
          </motion.button>
        </form>

        <div className="mt-4">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ainda não tem conta? </span>
          <Link to="/register" className="link-text">Criar conta</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

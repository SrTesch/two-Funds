import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({ nome: '', login: '', senha: '', codigo_cc: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3000/auth/register', formData);
      setSuccess(response.data.message);
      setTimeout(() => navigate('/login'), 3000);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ padding: '32px 24px' }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px', textAlign: 'center' }}>Criar Conta</h1>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nome</label>
            <input 
              type="text" 
              name="nome"
              className="input-field" 
              value={formData.nome} 
              onChange={handleChange} 
              placeholder="Seu nome completo"
              required 
            />
          </div>

          <div className="input-group">
            <label>Login</label>
            <input 
              type="text" 
              name="login"
              className="input-field" 
              value={formData.login} 
              onChange={handleChange} 
              placeholder="Nome de usuário"
              required 
            />
          </div>
          
          <motion.div 
            className="input-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label>Senha</label>
            <input 
              type="password" 
              name="senha"
              className="input-field" 
              value={formData.senha} 
              onChange={handleChange} 
              placeholder="••••••••"
              required 
            />
          </motion.div>

          {error && <div className="error-text mb-6 text-center">{error}</div>}
          {success && <div className="success-text mb-6 text-center">{success}</div>}

          <motion.button 
            type="submit" 
            className="btn-primary mt-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Processando...' : <><UserPlus size={20} /> Cadastrar</>}
          </motion.button>
        </form>

        <div className="mt-4 text-center">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Já tem uma conta? </span>
          <Link to="/login" className="link-text">Fazer login</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;

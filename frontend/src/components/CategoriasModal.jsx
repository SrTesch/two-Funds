import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { X, Plus, Edit2, Trash2, Tag } from 'lucide-react';

const CategoriasModal = ({ isOpen, onClose, onCategoriasUpdated }) => {
  const [categorias, setCategorias] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState('DESPESA');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('DESPESA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen]);

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/categorias', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategorias(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenForm = (cat = null) => {
    setError('');
    if (cat) {
      setEditingCat(cat);
      setNome(cat.nome);
      setTipo(cat.tipo);
    } else {
      setEditingCat(null);
      setNome('');
      setTipo(tipoFiltro);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingCat) {
        await api.put(`/categorias/${editingCat.id}`, {
          nome,
          tipo
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post('/categorias', {
          nome,
          tipo
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsFormOpen(false);
      await fetchCategorias();
      if (onCategoriasUpdated) onCategoriasUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (catId) => {
    if (!window.confirm('Tem certeza que deseja remover esta categoria?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/categorias/${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCategorias();
      if (onCategoriasUpdated) onCategoriasUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir categoria.');
    }
  };

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipoFiltro);

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
          style={{ width: '90%', maxWidth: '420px', padding: '24px', position: 'relative', zIndex: 1001, maxHeight: '90vh', overflowY: 'auto' }}
        >
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={22} color="var(--primary)" />
            Gerenciar Categorias
          </h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '12px' }}>
            <button 
              type="button"
              onClick={() => setTipoFiltro('DESPESA')}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: tipoFiltro === 'DESPESA' ? '#EF4444' : 'transparent', color: tipoFiltro === 'DESPESA' ? 'white' : 'var(--text-muted)', fontWeight: tipoFiltro === 'DESPESA' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
            >
              Despesas
            </button>
            <button 
              type="button"
              onClick={() => setTipoFiltro('RECEITA')}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', background: tipoFiltro === 'RECEITA' ? '#10B981' : 'transparent', color: tipoFiltro === 'RECEITA' ? 'white' : 'var(--text-muted)', fontWeight: tipoFiltro === 'RECEITA' ? 600 : 400, cursor: 'pointer', transition: 'all 0.3s' }}
            >
              Receitas
            </button>
          </div>

          {!isFormOpen ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Categorias cadastradas:</span>
                <button 
                  onClick={() => handleOpenForm(null)}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <Plus size={16} /> Nova Categoria
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoriasFiltradas.map(c => {
                  const isGlobal = c.codigo_cc === null;
                  return (
                    <div 
                      key={c.id} 
                      style={{ 
                        background: 'white', 
                        borderRadius: '10px', 
                        padding: '12px 14px', 
                        display: 'flex', 
                        justify: 'space-between', 
                        alignItems: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.nome}</span>
                        {isGlobal && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            Padrão
                          </span>
                        )}
                      </div>

                      {!isGlobal && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenForm(c)}
                            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                            title="Editar categoria"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: 'var(--error)' }}
                            title="Excluir categoria"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: '1rem', marginBottom: '14px', fontWeight: 600 }}>
                {editingCat ? 'Editar Categoria' : 'Criar Nova Categoria'}
              </h3>

              <div className="input-group">
                <label>Nome da Categoria</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: Assinaturas, Mercado, Freelance" 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Tipo</label>
                <select 
                  className="input-field" 
                  value={tipo} 
                  onChange={(e) => setTipo(e.target.value)} 
                  style={{ appearance: 'none' }}
                >
                  <option value="DESPESA">Despesa (Gasto)</option>
                  <option value="RECEITA">Receita (Entrada)</option>
                </select>
              </div>

              {error && <div className="error-text mb-4 text-center">{error}</div>}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  style={{ flex: 1, background: '#E2E8F0', border: 'none', borderRadius: '12px', padding: '12px', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1 }} 
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CategoriasModal;

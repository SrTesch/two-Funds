import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Obter categorias (globais + as da conta conjunta do usuário)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    // Busca categorias onde codigo_cc é NULL (global) ou igual ao do usuário
    let query = 'SELECT * FROM categorias WHERE codigo_cc IS NULL';
    const params: any[] = [];

    if (user.codigo_cc) {
      query += ' OR codigo_cc = ?';
      params.push(user.codigo_cc);
    }
    
    query += ' ORDER BY tipo, nome';

    const [categorias] = await pool.query<RowDataPacket[]>(query, params);
    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Criar categoria personalizada para a conta conjunta
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Apenas usuários vinculados a uma conta conjunta podem criar categorias.' });
    }

    const { nome, tipo } = req.body;
    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
    }

    if (tipo !== 'DESPESA' && tipo !== 'RECEITA') {
      return res.status(400).json({ error: 'Tipo inválido. Deve ser DESPESA ou RECEITA.' });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO categorias (nome, tipo, codigo_cc) VALUES (?, ?, ?)',
      [nome, tipo, user.codigo_cc]
    );

    res.status(201).json({ message: 'Categoria criada com sucesso.', id: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Categoria já existe para esta conta e tipo.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Editar categoria personalizada
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { nome, tipo } = req.body;

    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Não autorizado a editar categorias.' });
    }

    if (!nome) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
    }

    const [cats] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categorias WHERE id = ? AND codigo_cc = ?',
      [id, user.codigo_cc]
    );

    if (cats.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser editada (categorias globais não podem ser alteradas).' });
    }

    const tipoAtualizado = tipo || cats[0].tipo;
    await pool.query(
      'UPDATE categorias SET nome = ?, tipo = ? WHERE id = ?',
      [nome, tipoAtualizado, id]
    );

    res.json({ message: 'Categoria atualizada com sucesso.' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome e tipo.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao atualizar categoria.' });
  }
});

// Excluir categoria personalizada
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Não autorizado a excluir categorias.' });
    }

    const [cats] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categorias WHERE id = ? AND codigo_cc = ?',
      [id, user.codigo_cc]
    );

    if (cats.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou é uma categoria global do sistema.' });
    }

    await pool.query('DELETE FROM categorias WHERE id = ?', [id]);

    res.json({ message: 'Categoria removida com sucesso.' });
  } catch (error: any) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Esta categoria não pode ser removida pois existem lançamentos vinculados a ela.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao excluir categoria.' });
  }
});

export default router;


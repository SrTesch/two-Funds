import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

router.post('/register', async (req, res) => {
  try {
    const { nome, login, senha, codigo_cc } = req.body;
    
    if (!nome || !login || !senha) {
      return res.status(400).json({ error: 'Nome, login e senha são obrigatórios.' });
    }

    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM usuarios WHERE login = ?', [login]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Login já está em uso.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO usuarios (nome, login, senha, codigo_cc, is_approved) VALUES (?, ?, ?, ?, FALSE)',
      [nome, login, hashedPassword, codigo_cc || null]
    );

    res.status(201).json({ 
      message: 'Usuário registrado com sucesso. Aguardando aprovação do administrador.',
      id: result.insertId 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
    }

    const [users] = await pool.query<RowDataPacket[]>(`
      SELECT u.*, c.nome as cc_nome 
      FROM usuarios u 
      LEFT JOIN contas_conjuntas c ON u.codigo_cc = c.codigo 
      WHERE u.login = ?
    `, [login]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (!user.is_approved && !user.is_admin) {
      return res.status(403).json({ error: 'Sua conta ainda não foi aprovada por um administrador.' });
    }

    const token = jwt.sign({ id: user.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        login: user.login,
        codigo_cc: user.codigo_cc,
        cc_nome: user.cc_nome,
        avatar: user.avatar,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

import { authenticateToken, AuthRequest } from '../middleware/auth';

router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const [users] = await pool.query<RowDataPacket[]>(`
      SELECT u.id, u.nome, u.login, u.codigo_cc, u.avatar, u.is_admin, c.nome as cc_nome 
      FROM usuarios u 
      LEFT JOIN contas_conjuntas c ON u.codigo_cc = c.codigo 
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { nome, avatar, senha } = req.body;
    
    if (senha) {
      const hashedPassword = await bcrypt.hash(senha, 10);
      await pool.query('UPDATE usuarios SET nome = ?, avatar = ?, senha = ? WHERE id = ?', [nome, avatar, hashedPassword, userId]);
    } else {
      await pool.query('UPDATE usuarios SET nome = ?, avatar = ? WHERE id = ?', [nome, avatar, userId]);
    }
    
    res.json({ message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

export default router;

import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Middleware to check admin
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

router.use(authenticateToken, requireAdmin);

router.get('/pending', async (req, res) => {
  try {
    const [users] = await pool.query<RowDataPacket[]>('SELECT id, nome, login, codigo_cc, created_at FROM usuarios WHERE is_approved = FALSE AND is_admin = FALSE');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body; // true to approve, false to reject/delete
    
    if (approved) {
      await pool.query('UPDATE usuarios SET is_approved = TRUE WHERE id = ?', [id]);
      res.json({ message: 'Usuário aprovado com sucesso.' });
    } else {
      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
      res.json({ message: 'Solicitação rejeitada e usuário removido.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

export default router;

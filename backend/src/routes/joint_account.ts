import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();
router.use(authenticateToken);

// Gera novo código e cria a conta conjunta
router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { nome } = req.body;
    
    if (!nome) return res.status(400).json({ error: 'Nome da conta conjunta é obrigatório.' });

    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase(); // ex: 8A4F1D2C

    await pool.query('INSERT INTO contas_conjuntas (codigo, nome) VALUES (?, ?)', [codigo, nome]);
    await pool.query('UPDATE usuarios SET codigo_cc = ? WHERE id = ?', [codigo, userId]);

    res.json({ message: 'Conta conjunta criada com sucesso.', codigo, nome });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Solicita entrar em uma conta conjunta existente
router.post('/join', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { codigo_cc } = req.body;

    if (!codigo_cc) return res.status(400).json({ error: 'Código é obrigatório.' });

    const [cc] = await pool.query<RowDataPacket[]>('SELECT codigo FROM contas_conjuntas WHERE codigo = ?', [codigo_cc]);
    if (cc.length === 0) return res.status(404).json({ error: 'Conta conjunta não encontrada.' });

    const [existingReq] = await pool.query<RowDataPacket[]>('SELECT id FROM solicitacoes_cc WHERE usuario_id = ? AND codigo_cc = ? AND status = "PENDENTE"', [userId, codigo_cc]);
    if (existingReq.length > 0) return res.status(400).json({ error: 'Você já possui uma solicitação pendente para esta conta.' });

    await pool.query('INSERT INTO solicitacoes_cc (usuario_id, codigo_cc) VALUES (?, ?)', [userId, codigo_cc]);

    res.json({ message: 'Solicitação enviada. Aguardando aprovação.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Altera o nome da conta conjunta
router.put('/rename', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { nome } = req.body;
    
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório.' });

    const [users] = await pool.query<RowDataPacket[]>('SELECT codigo_cc FROM usuarios WHERE id = ?', [userId]);
    const codigo_cc = users[0]?.codigo_cc;

    if (!codigo_cc) return res.status(400).json({ error: 'Você não possui uma conta conjunta.' });

    await pool.query('UPDATE contas_conjuntas SET nome = ? WHERE codigo = ?', [nome, codigo_cc]);

    res.json({ message: 'Nome da conta conjunta atualizado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Lista solicitações pendentes (para quem já está na conta conjunta)
router.get('/requests', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const [users] = await pool.query<RowDataPacket[]>('SELECT codigo_cc FROM usuarios WHERE id = ?', [userId]);
    const codigo_cc = users[0]?.codigo_cc;

    if (!codigo_cc) return res.json([]);

    const [requests] = await pool.query<RowDataPacket[]>(
      `SELECT s.id, u.nome, u.login, s.status, s.created_at 
       FROM solicitacoes_cc s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.codigo_cc = ? AND s.status = 'PENDENTE'`, 
      [codigo_cc]
    );

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Aprova ou rejeita solicitação
router.post('/approve/:solicitacao_id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { solicitacao_id } = req.params;
    const { approved } = req.body; // boolean

    const [users] = await pool.query<RowDataPacket[]>('SELECT codigo_cc FROM usuarios WHERE id = ?', [userId]);
    const codigo_cc = users[0]?.codigo_cc;

    if (!codigo_cc) return res.status(403).json({ error: 'Você não está em uma conta conjunta.' });

    const [requests] = await pool.query<RowDataPacket[]>('SELECT * FROM solicitacoes_cc WHERE id = ? AND codigo_cc = ? AND status = "PENDENTE"', [solicitacao_id, codigo_cc]);
    if (requests.length === 0) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const targetUserId = requests[0].usuario_id;

    if (approved) {
      await pool.query('UPDATE solicitacoes_cc SET status = "APROVADO" WHERE id = ?', [solicitacao_id]);
      await pool.query('UPDATE usuarios SET codigo_cc = ? WHERE id = ?', [codigo_cc, targetUserId]);
      res.json({ message: 'Solicitação aprovada.' });
    } else {
      await pool.query('UPDATE solicitacoes_cc SET status = "REJEITADO" WHERE id = ?', [solicitacao_id]);
      res.json({ message: 'Solicitação rejeitada.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

export default router;

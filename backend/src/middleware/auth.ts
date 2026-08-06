import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    is_admin: boolean;
    codigo_cc?: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acesso negado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const [users] = await pool.query<RowDataPacket[]>('SELECT id, is_admin, codigo_cc FROM usuarios WHERE id = ?', [decoded.id]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    req.user = {
      id: users[0].id,
      is_admin: Boolean(users[0].is_admin),
      codigo_cc: users[0].codigo_cc
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

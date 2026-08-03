import request from 'supertest';
import express from 'express';
import authRoutes from '../auth';
import { pool } from '../../db';

// Mock do pool de conexões do DB para não usar o banco real
jest.mock('../../db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('deve retornar erro 400 se faltar nome, login ou senha', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Teste', login: 'teste' }); // Faltando senha
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nome, login e senha são obrigatórios.');
    });

    it('deve registrar um usuário com sucesso', async () => {
      // Configurar o mock para retornar array vazio (login não em uso)
      (pool.query as jest.Mock).mockResolvedValueOnce([[]]);
      
      // Configurar o mock para retornar o insertId simulado
      (pool.query as jest.Mock).mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/auth/register')
        .send({ nome: 'Teste', login: 'teste', senha: '123' });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Usuário registrado com sucesso. Aguardando aprovação do administrador.');
    });
  });
});

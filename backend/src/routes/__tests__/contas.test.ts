import request from 'supertest';
import express from 'express';
import contasRoutes from '../contas';
import { pool } from '../../db';
import jwt from 'jsonwebtoken';

jest.mock('../../db', () => ({
  pool: {
    query: jest.fn(),
    getConnection: jest.fn(),
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const mockUserToken = jwt.sign({ id: 1, nome: 'Pedro', codigo_cc: 'CC123' }, JWT_SECRET);

const app = express();
app.use(express.json());
app.use('/contas', contasRoutes);

describe('Contas Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /contas', () => {
    it('deve retornar 401 sem token de autorização', async () => {
      const res = await request(app).get('/contas');
      expect(res.status).toBe(401);
    });

    it('deve retornar lista de contas do usuário', async () => {
      const mockContas = [
        { id: 1, nome: 'Nubank', banco: 'NUBANK', saldo_atual: '500.00' }
      ];
      (pool.query as jest.Mock).mockResolvedValueOnce([mockContas]);

      const res = await request(app)
        .get('/contas')
        .set('Authorization', `Bearer ${mockUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockContas);
    });
  });

  describe('POST /contas', () => {
    it('deve retornar 400 se faltar o nome da conta', async () => {
      const res = await request(app)
        .post('/contas')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({ banco: 'NUBANK' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nome da conta bancária é obrigatório.');
    });

    it('deve criar conta bancária com sucesso', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([{ insertId: 10 }]);

      const res = await request(app)
        .post('/contas')
        .set('Authorization', `Bearer ${mockUserToken}`)
        .send({ nome: 'Itaú Personalité', banco: 'ITAU', saldo_atual: 1000, cor: '#EC7000' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Conta bancária criada com sucesso.');
      expect(res.body.id).toBe(10);
    });
  });
});

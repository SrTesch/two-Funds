import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
router.use(authenticateToken);

// Listar contas bancárias
// Query param: joint=true para ver todas as contas da conta conjunta (pessoais + parceiro)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const { joint } = req.query;

    let query = `
      SELECT cb.*, u.nome as proprietario_nome, u.avatar as proprietario_avatar
      FROM contas_bancarias cb
      JOIN usuarios u ON cb.usuario_id = u.id
    `;
    const params: any[] = [];

    if (joint === 'true' && user.codigo_cc) {
      query += ' WHERE (cb.codigo_cc = ? OR cb.usuario_id IN (SELECT id FROM usuarios WHERE codigo_cc = ?))';
      params.push(user.codigo_cc, user.codigo_cc);
    } else {
      query += ' WHERE cb.usuario_id = ?';
      params.push(user.id);
    }

    query += ' ORDER BY cb.created_at ASC';

    const [contas] = await pool.query<RowDataPacket[]>(query, params);
    res.json(contas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor ao listar contas.' });
  }
});

// Criar nova conta bancária
router.post('/', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const { nome, banco, saldo_atual, cor } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da conta bancária é obrigatório.' });
    }

    const saldo = saldo_atual !== undefined ? parseFloat(saldo_atual) : 0;
    const bancoNome = banco || 'OUTROS';
    const corHex = cor || '#6366F1';

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO contas_bancarias (usuario_id, codigo_cc, nome, banco, saldo_atual, cor)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.codigo_cc || null, nome, bancoNome, saldo, corHex]
    );

    res.status(201).json({
      message: 'Conta bancária criada com sucesso.',
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao criar conta bancária.' });
  }
});

// Editar dados da conta bancária (nome, banco, cor)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { nome, banco, cor } = req.body;

    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const [contas] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM contas_bancarias WHERE id = ? AND usuario_id = ?',
      [id, user.id]
    );

    if (contas.length === 0) {
      return res.status(404).json({ error: 'Conta bancária não encontrada ou permissão negada.' });
    }

    await pool.query(
      'UPDATE contas_bancarias SET nome = ?, banco = ?, cor = ? WHERE id = ?',
      [nome || contas[0].nome, banco || contas[0].banco, cor || contas[0].cor, id]
    );

    res.json({ message: 'Conta bancária atualizada com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao atualizar conta bancária.' });
  }
});

// Ajustar/Editar saldo atual da conta bancária
router.put('/:id/saldo', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { saldo_atual } = req.body;

    if (!user) return res.status(401).json({ error: 'Não autorizado.' });
    if (saldo_atual === undefined || isNaN(Number(saldo_atual))) {
      return res.status(400).json({ error: 'Saldo atual é obrigatório e deve ser um número válido.' });
    }

    const [contas] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM contas_bancarias WHERE id = ? AND usuario_id = ?',
      [id, user.id]
    );

    if (contas.length === 0) {
      return res.status(404).json({ error: 'Conta bancária não encontrada ou permissão negada.' });
    }

    await pool.query(
      'UPDATE contas_bancarias SET saldo_atual = ? WHERE id = ?',
      [parseFloat(saldo_atual), id]
    );

    res.json({ message: 'Saldo da conta atualizado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao atualizar saldo da conta.' });
  }
});

// Excluir conta bancária
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const [contas] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM contas_bancarias WHERE id = ? AND usuario_id = ?',
      [id, user.id]
    );

    if (contas.length === 0) {
      return res.status(404).json({ error: 'Conta bancária não encontrada ou permissão negada.' });
    }

    await pool.query('DELETE FROM contas_bancarias WHERE id = ?', [id]);

    res.json({ message: 'Conta bancária removida com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao remover conta bancária.' });
  }
});

// Transferir dinheiro entre contas
router.post('/transferir', async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const { conta_origem_id, conta_destino_id, valor, descricao, data_transferencia } = req.body;

    if (!conta_origem_id || !conta_destino_id || !valor) {
      return res.status(400).json({ error: 'Conta de origem, destino e valor são obrigatórios.' });
    }

    if (Number(conta_origem_id) === Number(conta_destino_id)) {
      return res.status(400).json({ error: 'A conta de origem e de destino não podem ser a mesma.' });
    }

    const valorTransferencia = parseFloat(valor);
    if (isNaN(valorTransferencia) || valorTransferencia <= 0) {
      return res.status(400).json({ error: 'Valor da transferência deve ser maior que zero.' });
    }

    // Verificar se a conta de origem pertence ao usuário
    const [contasOrigem] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM contas_bancarias WHERE id = ? AND usuario_id = ?',
      [conta_origem_id, user.id]
    );

    if (contasOrigem.length === 0) {
      return res.status(403).json({ error: 'Conta de origem inválida ou não pertence a você.' });
    }

    // Verificar se a conta de destino pertence ao usuário ou ao parceiro da conta conjunta
    let queryDestino = 'SELECT * FROM contas_bancarias WHERE id = ? AND (usuario_id = ?';
    const paramsDestino: any[] = [conta_destino_id, user.id];

    if (user.codigo_cc) {
      queryDestino += ' OR codigo_cc = ? OR usuario_id IN (SELECT id FROM usuarios WHERE codigo_cc = ?)';
      paramsDestino.push(user.codigo_cc, user.codigo_cc);
    }
    queryDestino += ')';

    const [contasDestino] = await connection.query<RowDataPacket[]>(queryDestino, paramsDestino);

    if (contasDestino.length === 0) {
      return res.status(403).json({ error: 'Conta de destino não encontrada ou sem permissão de acesso.' });
    }

    await connection.beginTransaction();

    // Abater saldo da origem
    await connection.query(
      'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
      [valorTransferencia, conta_origem_id]
    );

    // Adicionar saldo no destino
    await connection.query(
      'UPDATE contas_bancarias SET saldo_atual = saldo_atual + ? WHERE id = ?',
      [valorTransferencia, conta_destino_id]
    );

    const dataTransf = data_transferencia || new Date().toISOString().split('T')[0];

    // Registrar histórico da transferência
    await connection.query(
      `INSERT INTO transferencias (conta_origem_id, conta_destino_id, usuario_id, valor, descricao, data_transferencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [conta_origem_id, conta_destino_id, user.id, valorTransferencia, descricao || 'Transferência entre contas', dataTransf]
    );

    await connection.commit();

    res.status(201).json({ message: 'Transferência realizada com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao processar transferência.' });
  } finally {
    connection.release();
  }
});

// Consultar histórico de transferências
router.get('/transferencias', async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Não autorizado.' });

    const { joint } = req.query;

    let query = `
      SELECT t.*, 
             co.nome as conta_origem_nome, co.banco as conta_origem_banco,
             cd.nome as conta_destino_nome, cd.banco as conta_destino_banco,
             u.nome as usuario_nome
      FROM transferencias t
      JOIN contas_bancarias co ON t.conta_origem_id = co.id
      JOIN contas_bancarias cd ON t.conta_destino_id = cd.id
      JOIN usuarios u ON t.usuario_id = u.id
    `;
    const params: any[] = [];

    if (joint === 'true' && user.codigo_cc) {
      query += ' WHERE (co.codigo_cc = ? OR cd.codigo_cc = ? OR co.usuario_id IN (SELECT id FROM usuarios WHERE codigo_cc = ?) OR cd.usuario_id IN (SELECT id FROM usuarios WHERE codigo_cc = ?))';
      params.push(user.codigo_cc, user.codigo_cc, user.codigo_cc, user.codigo_cc);
    } else {
      query += ' WHERE t.usuario_id = ?';
      params.push(user.id);
    }

    query += ' ORDER BY t.data_transferencia DESC, t.created_at DESC';

    const [transferencias] = await pool.query<RowDataPacket[]>(query, params);
    res.json(transferencias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao buscar histórico de transferências.' });
  }
});

export default router;

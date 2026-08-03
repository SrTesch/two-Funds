import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Obter previsões de faturas (lançamentos de crédito + faturas avulsas/retroativas)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { personal } = req.query; 

    // Lançamentos de cartão de crédito
    let queryLancamentos = `
      SELECT l.id, l.codigo_cc, l.usuario_id, l.categoria_id, l.descricao, l.valor, l.tipo,
             l.is_personal, l.metodo_pagamento, l.status, l.data_lancamento, l.data_vencimento,
             l.parcela_atual, l.total_parcelas, l.created_at,
             c.nome as categoria_nome, u.nome as usuario_nome, 'LANCAMENTO' as origem
      FROM lancamentos l
      JOIN categorias c ON l.categoria_id = c.id
      JOIN usuarios u ON l.usuario_id = u.id
      WHERE l.codigo_cc = ? AND l.metodo_pagamento = 'CREDITO'
    `;
    const paramsLancamentos: any[] = [user.codigo_cc];

    if (personal === 'true') {
      queryLancamentos += ' AND l.usuario_id = ?';
      paramsLancamentos.push(user.id);
    }

    // Faturas avulsas / retroativas
    let queryFaturasAvulsas = `
      SELECT fa.id, fa.codigo_cc, fa.usuario_id, 0 as categoria_id, fa.descricao, fa.valor, 'DESPESA' as tipo,
             fa.is_personal, 'CREDITO' as metodo_pagamento, fa.status, fa.created_at as data_lancamento,
             fa.data_vencimento, 1 as parcela_atual, 1 as total_parcelas, fa.created_at,
             'Fatura Retroativa' as categoria_nome, u.nome as usuario_nome, 'FATURA_AVULSA' as origem
      FROM faturas_avulsas fa
      JOIN usuarios u ON fa.usuario_id = u.id
      WHERE fa.codigo_cc = ?
    `;
    const paramsFaturas: any[] = [user.codigo_cc];

    if (personal === 'true') {
      queryFaturasAvulsas += ' AND fa.usuario_id = ?';
      paramsFaturas.push(user.id);
    }

    const [lancamentos] = await pool.query<RowDataPacket[]>(queryLancamentos, paramsLancamentos);
    const [faturasAvulsas] = await pool.query<RowDataPacket[]>(queryFaturasAvulsas, paramsFaturas);

    const todos = [...lancamentos, ...faturasAvulsas].sort((a, b) => {
      return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
    });

    res.json(todos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor ao obter faturas.' });
  }
});

// Cadastrar fatura retroativa / pré-existente
router.post('/retroativa', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { descricao, valor, mes_referencia, data_vencimento, is_personal } = req.body;

    if (!valor || !mes_referencia || !data_vencimento) {
      return res.status(400).json({ error: 'Valor, mês de referência e data de vencimento são obrigatórios.' });
    }

    const desc = descricao || `Fatura Cartão (${mes_referencia})`;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO faturas_avulsas (usuario_id, codigo_cc, descricao, valor, mes_referencia, data_vencimento, is_personal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.codigo_cc, desc, parseFloat(valor), mes_referencia, data_vencimento, is_personal ? true : false]
    );

    res.status(201).json({ message: 'Fatura retroativa cadastrada com sucesso.', id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao cadastrar fatura retroativa.' });
  }
});

// Pagar fatura ou parcela(s) antecipada(s) debitando de uma conta bancária
router.post('/pagar', authenticateToken, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { lancamentos_ids, faturas_avulsas_ids, conta_id } = req.body;
    
    if ((!lancamentos_ids || lancamentos_ids.length === 0) && (!faturas_avulsas_ids || faturas_avulsas_ids.length === 0)) {
      return res.status(400).json({ error: 'Nenhum lançamento ou fatura selecionada para pagamento.' });
    }

    await connection.beginTransaction();

    let totalPago = 0;

    // Processar lançamentos normais de crédito
    if (lancamentos_ids && Array.isArray(lancamentos_ids) && lancamentos_ids.length > 0) {
      const placeholders = lancamentos_ids.map(() => '?').join(',');
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT SUM(valor) as total FROM lancamentos WHERE id IN (${placeholders}) AND codigo_cc = ? AND status = 'PENDENTE'`,
        [...lancamentos_ids, user.codigo_cc]
      );
      totalPago += Number(rows[0]?.total || 0);

      await connection.query(
        `UPDATE lancamentos SET status = 'PAGO' WHERE id IN (${placeholders}) AND codigo_cc = ?`,
        [...lancamentos_ids, user.codigo_cc]
      );
    }

    // Processar faturas avulsas
    if (faturas_avulsas_ids && Array.isArray(faturas_avulsas_ids) && faturas_avulsas_ids.length > 0) {
      const placeholdersFav = faturas_avulsas_ids.map(() => '?').join(',');
      const [rowsFav] = await connection.query<RowDataPacket[]>(
        `SELECT SUM(valor) as total FROM faturas_avulsas WHERE id IN (${placeholdersFav}) AND codigo_cc = ? AND status = 'PENDENTE'`,
        [...faturas_avulsas_ids, user.codigo_cc]
      );
      totalPago += Number(rowsFav[0]?.total || 0);

      await connection.query(
        `UPDATE faturas_avulsas SET status = 'PAGO' WHERE id IN (${placeholdersFav}) AND codigo_cc = ?`,
        [...faturas_avulsas_ids, user.codigo_cc]
      );
    }

    // Se uma conta bancária foi informada, deduz o saldo da conta
    if (conta_id && totalPago > 0) {
      const contaIdNum = Number(conta_id);
      await connection.query(
        'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
        [totalPago, contaIdNum]
      );
    }

    await connection.commit();

    res.json({ message: 'Pagamento de fatura registrado com sucesso.', totalPago });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao processar pagamento da fatura.' });
  } finally {
    connection.release();
  }
});

export default router;

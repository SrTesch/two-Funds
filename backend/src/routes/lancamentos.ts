import express from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Obter lançamentos da conta
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { personal, status } = req.query; 
    let query = `
      SELECT l.*, c.nome as categoria_nome, u.nome as usuario_nome, u.avatar as usuario_avatar,
             cb.nome as conta_nome, cb.banco as conta_banco, cb.cor as conta_cor
      FROM lancamentos l
      JOIN categorias c ON l.categoria_id = c.id
      JOIN usuarios u ON l.usuario_id = u.id
      LEFT JOIN contas_bancarias cb ON l.conta_id = cb.id
      WHERE l.codigo_cc = ?
    `;
    const params: any[] = [user.codigo_cc];

    if (personal === 'true') {
      query += ' AND l.usuario_id = ? AND (l.is_personal = TRUE OR l.is_personal = 1)';
      params.push(user.id);
    } else {
      query += ' AND (l.is_personal = FALSE OR l.is_personal = 0 OR l.is_personal IS NULL)';
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    query += ' ORDER BY l.data_vencimento DESC, l.created_at DESC';

    const [lancamentos] = await pool.query<RowDataPacket[]>(query, params);
    res.json(lancamentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Editar lançamento existente
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { id } = req.params;
    const {
      categoria_id,
      conta_id,
      descricao,
      valor,
      tipo,
      data_lancamento,
      metodo_pagamento
    } = req.body;

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM lancamentos WHERE id = ? AND codigo_cc = ?',
      [id, user.codigo_cc]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado ou sem permissão.' });
    }

    const oldLanc = rows[0];
    await connection.beginTransaction();

    // Reverter o saldo da conta antiga se estava PAGO
    if (oldLanc.status === 'PAGO' && oldLanc.conta_id) {
      if (oldLanc.tipo === 'RECEITA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
          [oldLanc.valor, oldLanc.conta_id]
        );
      } else if (oldLanc.tipo === 'DESPESA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual + ? WHERE id = ?',
          [oldLanc.valor, oldLanc.conta_id]
        );
      }
    }

    const novoValor = valor !== undefined ? parseFloat(valor) : Number(oldLanc.valor);
    const novaContaId = conta_id !== undefined ? (conta_id ? Number(conta_id) : null) : oldLanc.conta_id;
    const novoTipo = tipo || oldLanc.tipo;
    const dataLanc = data_lancamento || oldLanc.data_lancamento;
    const dataVenc = data_lancamento || oldLanc.data_vencimento;

    await connection.query(
      `UPDATE lancamentos 
       SET categoria_id = ?, conta_id = ?, descricao = ?, valor = ?, tipo = ?, data_lancamento = ?, data_vencimento = ?, metodo_pagamento = ?
       WHERE id = ?`,
      [
        categoria_id || oldLanc.categoria_id,
        novaContaId,
        descricao || oldLanc.descricao,
        novoValor,
        novoTipo,
        dataLanc,
        dataVenc,
        metodo_pagamento || oldLanc.metodo_pagamento,
        id
      ]
    );

    // Aplicar novo saldo na nova/mesma conta bancária se o lançamento estiver PAGO
    if (oldLanc.status === 'PAGO' && novaContaId) {
      if (novoTipo === 'RECEITA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual + ? WHERE id = ?',
          [novoValor, novaContaId]
        );
      } else if (novoTipo === 'DESPESA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
          [novoValor, novaContaId]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Lançamento atualizado com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao atualizar lançamento.' });
  } finally {
    connection.release();
  }
});

// Excluir lançamento
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { id } = req.params;
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM lancamentos WHERE id = ? AND codigo_cc = ?',
      [id, user.codigo_cc]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lançamento não encontrado ou sem permissão.' });
    }

    const lancamento = rows[0];
    await connection.beginTransaction();

    // Se o lançamento estava PAGO e atrelado a uma conta bancária, reverte o valor no saldo
    if (lancamento.status === 'PAGO' && lancamento.conta_id) {
      if (lancamento.tipo === 'RECEITA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
          [lancamento.valor, lancamento.conta_id]
        );
      } else if (lancamento.tipo === 'DESPESA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual + ? WHERE id = ?',
          [lancamento.valor, lancamento.conta_id]
        );
      }
    }

    await connection.query('DELETE FROM lancamentos WHERE id = ?', [id]);
    await connection.commit();

    res.json({ message: 'Lançamento removido com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao excluir lançamento.' });
  } finally {
    connection.release();
  }
});

// Criar novo lançamento
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const connection = await pool.getConnection();
  try {
    const user = req.user;
    if (!user || !user.codigo_cc) {
      return res.status(403).json({ error: 'Conta conjunta não vinculada.' });
    }

    const { 
      categoria_id, 
      conta_id,
      descricao, 
      valor, 
      tipo, 
      is_personal, 
      data_lancamento,
      metodo_pagamento,
      total_parcelas 
    } = req.body;

    if (!categoria_id || !descricao || valor === undefined || !tipo || !data_lancamento) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    const metodo = metodo_pagamento || 'PIX';
    const parcelas = metodo === 'CREDITO' ? (total_parcelas || 1) : 1;
    const statusLancamento = metodo === 'CREDITO' ? 'PENDENTE' : 'PAGO';
    const valorTotal = Number(valor);
    const valorParcela = valorTotal / parcelas;
    
    const baseDate = new Date(data_lancamento);

    await connection.beginTransaction();

    const values = [];
    let query = `INSERT INTO lancamentos 
       (codigo_cc, usuario_id, categoria_id, conta_id, descricao, valor, tipo, is_personal, metodo_pagamento, status, data_lancamento, data_vencimento, parcela_atual, total_parcelas) 
       VALUES `;
    const queryParams: any[] = [];

    const contaIdVal = conta_id ? Number(conta_id) : null;

    for (let i = 1; i <= parcelas; i++) {
      // Avança um mês por parcela (Crédito vence no mês seguinte)
      const vencimento = new Date(baseDate);
      if (metodo === 'CREDITO') {
        vencimento.setMonth(vencimento.getMonth() + i);
      }
      const dataVencimentoStr = vencimento.toISOString().split('T')[0];
      
      const descParcelada = parcelas > 1 ? `${descricao} (${i}/${parcelas})` : descricao;
      
      values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      queryParams.push(
        user.codigo_cc, 
        user.id, 
        categoria_id, 
        contaIdVal,
        descParcelada, 
        valorParcela, 
        tipo, 
        is_personal || false,
        metodo,
        statusLancamento,
        data_lancamento,
        dataVencimentoStr,
        i,
        parcelas
      );
    }
    
    query += values.join(', ');

    await connection.query<ResultSetHeader>(query, queryParams);

    // Se o lançamento é PAGO e foi informada uma conta bancária, atualiza o saldo da conta
    if (statusLancamento === 'PAGO' && contaIdVal) {
      if (tipo === 'RECEITA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual + ? WHERE id = ?',
          [valorTotal, contaIdVal]
        );
      } else if (tipo === 'DESPESA') {
        await connection.query(
          'UPDATE contas_bancarias SET saldo_atual = saldo_atual - ? WHERE id = ?',
          [valorTotal, contaIdVal]
        );
      }
    }

    await connection.commit();

    res.status(201).json({ message: 'Lançamento registrado com sucesso.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor ao registrar lançamento.' });
  } finally {
    connection.release();
  }
});

export default router;

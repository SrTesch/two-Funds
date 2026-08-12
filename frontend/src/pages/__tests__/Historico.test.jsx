import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Historico from '../Historico';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/lancamentos')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              descricao: 'Mercado Silva',
              categoria_nome: 'Alimentação',
              valor: '150.00',
              tipo: 'DESPESA',
              metodo_pagamento: 'PIX',
              status: 'PAGO',
              data_lancamento: '2026-08-10T00:00:00.000Z',
              usuario_nome: 'Pedro'
            },
            {
              id: 2,
              descricao: 'Combustível Posto',
              categoria_nome: 'Transporte',
              valor: '200.00',
              tipo: 'DESPESA',
              metodo_pagamento: 'CREDITO',
              status: 'PENDENTE',
              data_lancamento: '2026-08-11T00:00:00.000Z',
              usuario_nome: 'Pedro'
            }
          ]
        });
      }
      if (url.includes('/contas/transferencias')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    }),
    delete: vi.fn().mockResolvedValue({ data: { message: 'Sucesso' } })
  }
}));

describe('Historico Component', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, nome: 'Pedro', codigo_cc: 'CC123' }));
  });

  it('deve filtrar transações por texto corretamente ao digitar "merc"', async () => {
    render(<Historico />);

    await waitFor(() => {
      expect(screen.getByText('Mercado Silva')).toBeInTheDocument();
      expect(screen.getByText('Combustível Posto')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por descrição, categoria, conta, valor.../i);
    fireEvent.change(searchInput, { target: { value: 'merc' } });

    expect(screen.getByText('Mercado Silva')).toBeInTheDocument();
    expect(screen.queryByText('Combustível Posto')).not.toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import axios from 'axios';

vi.mock('axios');

describe('Login Component', () => {
  it('deve renderizar o título e os inputs', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByText('Bem vindo de volta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Seu usuário')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro se o login falhar', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Credenciais inválidas.' } }
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const loginInput = screen.getByPlaceholderText('Seu usuário');
    const senhaInput = screen.getByPlaceholderText('••••••••');
    const button = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(loginInput, { target: { value: 'teste' } });
    fireEvent.change(senhaInput, { target: { value: 'errada' } });
    fireEvent.click(button);

    const errorMessage = await screen.findByText('Credenciais inválidas.');
    expect(errorMessage).toBeInTheDocument();
  });
});

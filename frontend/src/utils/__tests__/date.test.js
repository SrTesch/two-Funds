import { describe, it, expect } from 'vitest';
import { parseLocalDate, formatLocalDate } from '../date';

describe('date utility', () => {
  it('deve converter string YYYY-MM-DD para Date no fuso local', () => {
    const d = parseLocalDate('2026-08-05');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // Mês 7 = Agosto (0-indexed)
    expect(d.getDate()).toBe(5);
  });

  it('deve formatar data no formato pt-BR sem alterar o dia', () => {
    const formatted = formatLocalDate('2026-08-05');
    expect(formatted).toBe('05/08/2026');
  });
});

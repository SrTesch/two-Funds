/**
 * Converte strings de data (ex: '2026-08-05' ou '2026-08-05T00:00:00.000Z')
 * para um objeto Date no fuso horário local, sem deslocamento UTC.
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

/**
 * Formata uma string de data no formato pt-BR (ex: '05/08/2026') sem perder 1 dia por conversão UTC.
 */
export const formatLocalDate = (dateStr) => {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('pt-BR');
};

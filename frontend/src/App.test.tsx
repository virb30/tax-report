import { render, screen } from '@testing-library/react';

import { App } from './App';
import { createTaxReportApiMock, installTaxReportApiMock } from './test/create-tax-report-api-mock';

describe('App navigation', () => {
  it('renders the moved workflow tabs from frontend source', () => {
    const api = createTaxReportApiMock();
    api.listBrokers.mockResolvedValue({ items: [] });
    api.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    installTaxReportApiMock(api);

    render(<App />);

    expect(screen.getByRole('button', { name: 'Importacao e Conferencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saldo Inicial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Posicoes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imposto Mensal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relatorio Bens e Direitos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corretoras' })).toBeInTheDocument();
  });
});

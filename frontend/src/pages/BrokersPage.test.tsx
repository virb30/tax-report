import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BrokersPage } from './BrokersPage';
import {
  createTaxReportApiMock,
  installTaxReportApiMock,
} from '../test/create-tax-report-api-mock';

describe('BrokersPage', () => {
  it('loads, creates, edits, and toggles brokers through the frontend API boundary', async () => {
    const api = createTaxReportApiMock();
    api.listBrokers
      .mockResolvedValueOnce({
        items: [
          {
            id: 'broker-xp',
            code: 'XP',
            name: 'XP Investimentos',
            cnpj: '02.332.886/0001-04',
            active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'broker-xp',
            code: 'XP',
            name: 'XP Investimentos',
            cnpj: '02.332.886/0001-04',
            active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'broker-xp',
            code: 'XP',
            name: 'XP Investimentos Atualizada',
            cnpj: '02.332.886/0001-04',
            active: true,
          },
        ],
      })
      .mockResolvedValue({
        items: [
          {
            id: 'broker-xp',
            code: 'XP',
            name: 'XP Investimentos Atualizada',
            cnpj: '02.332.886/0001-04',
            active: false,
          },
        ],
      });
    api.createBroker.mockResolvedValue({
      success: true,
      broker: {
        id: 'broker-rico',
        code: 'RICO',
        name: 'Rico',
        cnpj: '12.345.678/0001-90',
        active: true,
      },
    });
    api.updateBroker.mockResolvedValue({
      success: true,
      broker: {
        id: 'broker-xp',
        code: 'XP',
        name: 'XP Investimentos Atualizada',
        cnpj: '02.332.886/0001-04',
        active: true,
      },
    });
    api.toggleBrokerActive.mockResolvedValue({
      success: true,
      broker: {
        id: 'broker-xp',
        code: 'XP',
        name: 'XP Investimentos Atualizada',
        cnpj: '02.332.886/0001-04',
        active: false,
      },
    });
    installTaxReportApiMock(api);

    const user = userEvent.setup();
    render(<BrokersPage />);

    expect(await screen.findByText('XP Investimentos')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Codigo'), 'RICO');
    await user.type(screen.getByLabelText('Nome'), 'Rico');
    await user.type(screen.getByLabelText('CNPJ'), '12.345.678/0001-90');
    await user.click(screen.getByRole('button', { name: 'Cadastrar corretora' }));

    await waitFor(() => {
      expect(api.createBroker).toHaveBeenCalledWith({
        code: 'RICO',
        name: 'Rico',
        cnpj: '12.345.678/0001-90',
      });
      expect(screen.getByText('Corretora cadastrada com sucesso.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getAllByLabelText('Nome')[1]);
    await user.type(screen.getAllByLabelText('Nome')[1], 'XP Investimentos Atualizada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.updateBroker).toHaveBeenCalledWith({
        id: 'broker-xp',
        code: 'XP',
        name: 'XP Investimentos Atualizada',
        cnpj: '02.332.886/0001-04',
      });
      expect(screen.getByText('Corretora atualizada com sucesso.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Desativar' }));

    await waitFor(() => {
      expect(api.toggleBrokerActive).toHaveBeenCalledWith({ id: 'broker-xp' });
      expect(screen.getByText('Corretora desativada.')).toBeInTheDocument();
    });
  });

  it('surfaces broker API errors without clearing the page', async () => {
    const api = createTaxReportApiMock();
    api.listBrokers.mockRejectedValue(new Error('Falha ao listar corretoras.'));
    installTaxReportApiMock(api);

    render(<BrokersPage />);

    expect(await screen.findByText('Falha ao listar corretoras.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar corretora' })).toBeDisabled();
  });
});

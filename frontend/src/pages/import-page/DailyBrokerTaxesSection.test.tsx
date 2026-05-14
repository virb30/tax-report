import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DailyBrokerTaxesSection } from './DailyBrokerTaxesSection';
import {
  createTaxReportApiMock,
  installTaxReportApiMock,
} from '../../test/create-tax-report-api-mock';
import type { Broker } from '../../types/broker.types';

const brokers: Broker[] = [
  {
    id: 'broker-xp',
    code: 'XP',
    name: 'XP Investimentos',
    cnpj: '02.332.886/0001-04',
    active: true,
  },
];

describe('DailyBrokerTaxesSection', () => {
  it('saves, imports, and deletes daily broker taxes through the API boundary', async () => {
    const api = createTaxReportApiMock();
    api.listDailyBrokerTaxes
      .mockResolvedValueOnce({
        items: [
          {
            date: '2025-03-10',
            brokerId: 'broker-xp',
            brokerCode: 'XP',
            brokerName: 'XP Investimentos',
            fees: 3.5,
            irrf: 0.15,
          },
        ],
      })
      .mockResolvedValue({
        items: [
          {
            date: '2025-03-10',
            brokerId: 'broker-xp',
            brokerCode: 'XP',
            brokerName: 'XP Investimentos',
            fees: 3.5,
            irrf: 0.15,
          },
        ],
      });
    api.saveDailyBrokerTax.mockResolvedValue({
      tax: {
        date: '2025-03-11',
        brokerId: 'broker-xp',
        brokerCode: 'XP',
        brokerName: 'XP Investimentos',
        fees: 2.2,
        irrf: 0.1,
      },
      recalculatedTickers: ['PETR4'],
    });
    const importFile = new File(['date,broker'], 'taxes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    api.importDailyBrokerTaxes.mockResolvedValue({
      importedCount: 2,
      recalculatedTickers: [],
    });
    api.deleteDailyBrokerTax.mockResolvedValue({
      deleted: true,
      recalculatedTickers: ['PETR4'],
    });
    installTaxReportApiMock(api);

    const user = userEvent.setup();
    render(<DailyBrokerTaxesSection brokers={brokers} />);

    expect(await screen.findByText('XP - XP Investimentos')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Data'), '2025-03-11');
    await user.type(screen.getByLabelText('Taxas'), '2,20');
    await user.type(screen.getByLabelText('IRRF'), '0,10');
    await user.click(screen.getByRole('button', { name: 'Salvar taxa diária' }));

    await waitFor(() => {
      expect(api.saveDailyBrokerTax).toHaveBeenCalledWith({
        date: '2025-03-11',
        brokerId: 'broker-xp',
        fees: 2.2,
        irrf: 0.1,
      });
      expect(screen.getByText(/Taxa diária salva/)).toBeInTheDocument();
    });

    await user.upload(screen.getByLabelText('Importar planilha'), importFile);

    await waitFor(() => {
      expect(api.importDailyBrokerTaxes).toHaveBeenCalledWith({ file: importFile });
      expect(screen.getByText(/2 taxas diárias importadas/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(api.deleteDailyBrokerTax).toHaveBeenCalledWith({
        date: '2025-03-10',
        brokerId: 'broker-xp',
      });
      expect(screen.getByText(/Taxa diária excluída/)).toBeInTheDocument();
    });
  });

  it('keeps the import flow unchanged when file selection is cancelled', async () => {
    const api = createTaxReportApiMock();
    api.listDailyBrokerTaxes.mockResolvedValue({ items: [] });
    installTaxReportApiMock(api);

    const user = userEvent.setup();
    render(<DailyBrokerTaxesSection brokers={[]} />);

    await user.upload(screen.getByLabelText('Importar planilha'), []);

    await waitFor(() => {
      expect(api.importDailyBrokerTaxes).not.toHaveBeenCalled();
    });
  });
});

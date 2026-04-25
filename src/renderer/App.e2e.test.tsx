import '@testing-library/jest-dom';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType, TransactionType } from '../shared/types/domain';
import type { ElectronApi } from '../shared/types/electron-api';
import type { GenerateAssetsReportResult } from '../shared/contracts/assets-report.contract';
import type { SetInitialBalanceResult } from '../shared/contracts/initial-balance.contract';
import type { ListPositionsResult } from '../shared/contracts/list-positions.contract';
import { App } from './App';
import mock, { mockReset } from 'jest-mock-extended/lib/Mock';

describe('App critical UI flows (E2E)', () => {
  const electronApi = mock<ElectronApi>();

  beforeEach(() => {
    mockReset(electronApi);
  });

  it('runs import, manual base and annual report flows through UI', async () => {
    electronApi.importSelectFile.mockResolvedValue({ filePath: '/tmp/ops.csv' });

    electronApi.previewImportTransactions.mockResolvedValue({
        batches: [],
        transactionsPreview: [
          {
            date: '2025-03-10',
            ticker: 'PETR4',
            type: TransactionType.Buy,
            quantity: 10,
            unitPrice: 20,
            fees: 1,
            brokerId: 'broker-xp',
          },
        ],
      });

    electronApi.confirmImportTransactions.mockResolvedValue({ importedCount: 1, recalculatedTickers: ['PETR4'] });

    const setInitialBalanceResult: SetInitialBalanceResult = {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      quantity: 2,
      averagePrice: 300,
    };
    electronApi.setInitialBalance.mockResolvedValue(setInitialBalanceResult);

    const emptyPositionsResult: ListPositionsResult = {
      items: [],
    };
    const filledPositionsResult: ListPositionsResult = {
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Etf,
          totalQuantity: 2,
          averagePrice: 300,
          totalCost: 600,
          brokerBreakdown: [
            { brokerId: 'broker-xp', brokerName: 'XP', brokerCnpj: '00.000.000/0001-00', quantity: 2 },
          ],
        },
      ],
    };
    electronApi
      .listPositions
      .mockResolvedValueOnce(emptyPositionsResult)
      .mockResolvedValueOnce(filledPositionsResult);

    const assetsReportResult: GenerateAssetsReportResult = {
      referenceDate: '2025-12-31',
      items: [
        {
          ticker: 'IVVB11',
          assetType: AssetType.Etf,
          totalQuantity: 2,
          averagePrice: 300,
          totalCost: 600,
          revenueClassification: { group: '07', code: '09' },
          allocations: [
            {
              brokerId: 'broker-xp',
              brokerName: 'XP Investimentos',
              cnpj: '02.332.886/0001-04',
              quantity: 2,
              totalCost: 600,
              description:
                '2 cotas IVVB11. CNPJ: 02.332.886/0001-04. Corretora: XP Investimentos. Custo médio: R$ 300,00. Custo total: R$ 600,00.',
            },
          ],
        },
      ],
    };
    electronApi.generateAssetsReport.mockResolvedValue(assetsReportResult);

    electronApi.listBrokers.mockResolvedValue({
      items: [{ id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04', code: 'XP', active: true }],
    });
    electronApi.createBroker.mockResolvedValue({ success: true, broker: { id: 'new', name: 'New', cnpj: '00', code: 'NEW', active: true } });

    window.electronApi = {
      ...electronApi,
      appName: 'tax-report',
    } satisfies ElectronApi;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Selecionar' }));
    await waitFor(() => {
      expect(screen.getByDisplayValue('/tmp/ops.csv')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Conferir arquivo' }));
    await waitFor(() => {
      expect(screen.getByText(/Conferência pronta: 1 transações/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar importação' }));
    await waitFor(() => {
      expect(screen.getByText(/Importação concluída/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Saldo Inicial' }));
    await user.type(screen.getByLabelText('Ticker'), 'IVVB11');
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.clear(screen.getByLabelText('Preço médio (R$)'));
    await user.type(screen.getByLabelText('Preço médio (R$)'), '300');
    await user.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));
    await waitFor(() => {
      expect(screen.getByText('Saldo inicial cadastrado com sucesso.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('IVVB11')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Relatorio Bens e Direitos' }));
    await user.click(screen.getByRole('button', { name: 'Gerar Relatório' }));
    await waitFor(() => {
      expect(screen.getByText(/Data de referência: 2025-12-31/)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    await waitFor(() => {
      expect(screen.getByText(/copiado com sucesso/)).toBeInTheDocument();
    });

    expect(electronApi.importSelectFile).toHaveBeenCalledTimes(1);
    expect(electronApi.previewImportTransactions).toHaveBeenCalledWith({ filePath: '/tmp/ops.csv' });
    expect(electronApi.confirmImportTransactions).toHaveBeenCalledWith({ filePath: '/tmp/ops.csv' });
    expect(electronApi.setInitialBalance).toHaveBeenCalledTimes(1);
    expect(electronApi.generateAssetsReport).toHaveBeenCalledWith({ baseYear: 2025 });
  });
});

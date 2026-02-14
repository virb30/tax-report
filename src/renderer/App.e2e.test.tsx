/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { describe, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '../shared/types/domain';
import type { ElectronApi } from '../shared/types/electron-api';
import type { GenerateAssetsReportResult } from '../shared/contracts/assets-report.contract';
import type { SetInitialBalanceResult } from '../shared/contracts/initial-balance.contract';
import type { ListPositionsResult } from '../shared/contracts/list-positions.contract';
import { App } from './App';

describe('App critical UI flows (E2E)', () => {
  it('runs import, manual base and annual report flows through UI', async () => {
    const importSelectFile = jest
      .fn<ElectronApi['importSelectFile']>()
      .mockResolvedValue({ filePath: '/tmp/ops.csv' });

    const previewImportTransactions = jest
      .fn<ElectronApi['previewImportTransactions']>()
      .mockResolvedValue({
        batches: [],
        transactionsPreview: [
          {
            date: '2025-03-10',
            ticker: 'PETR4',
            type: 'buy',
            quantity: 10,
            unitPrice: 20,
            fees: 1,
            brokerId: 'broker-xp',
          },
        ],
      });

    const confirmImportTransactions = jest
      .fn<ElectronApi['confirmImportTransactions']>()
      .mockResolvedValue({ importedCount: 1, recalculatedTickers: ['PETR4'] });

    const setInitialBalanceResult: SetInitialBalanceResult = {
      ticker: 'IVVB11',
      brokerId: 'broker-xp',
      quantity: 2,
      averagePrice: 300,
    };
    const setInitialBalance = jest
      .fn<ElectronApi['setInitialBalance']>()
      .mockResolvedValue(setInitialBalanceResult);

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
    const listPositions = jest
      .fn<ElectronApi['listPositions']>()
      .mockResolvedValueOnce(emptyPositionsResult)
      .mockResolvedValueOnce(filledPositionsResult);

    const assetsReportResult: GenerateAssetsReportResult = {
      referenceDate: '2025-12-31',
      items: [
        {
          ticker: 'IVVB11',
          broker: 'XP',
          assetType: AssetType.Etf,
          quantity: 2,
          averagePrice: 300,
          totalCost: 600,
          revenueClassification: { group: '07', code: '09' },
          description: '2 actions/units IVVB11 - N/A. CNPJ: N/A. Broker: XP.',
        },
      ],
    };
    const generateAssetsReport = jest
      .fn<ElectronApi['generateAssetsReport']>()
      .mockResolvedValue(assetsReportResult);

    const listBrokers = jest.fn().mockResolvedValue({
      items: [{ id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' }],
    });
    const createBroker = jest.fn().mockResolvedValue({ success: true });

    window.electronApi = {
      appName: 'tax-report',
      importSelectFile,
      previewImportFromFile: jest.fn<ElectronApi['previewImportFromFile']>(),
      previewImportTransactions,
      importOperations: jest.fn<ElectronApi['importOperations']>(),
      confirmImportOperations: jest.fn<ElectronApi['confirmImportOperations']>(),
      confirmImportTransactions,
      setInitialBalance,
      listPositions,
      generateAssetsReport,
      listBrokers,
      createBroker,
      recalculatePosition: jest.fn<ElectronApi['recalculatePosition']>(),
      migrateYear: jest.fn<ElectronApi['migrateYear']>(),
    };

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
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
    await user.click(screen.getByRole('button', { name: 'Gerar relatorio' }));
    await waitFor(() => {
      expect(screen.getByText('Data de referencia: 2025-12-31')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Copiar discriminacao' }));
    await waitFor(() => {
      expect(screen.getByText(/copiado com sucesso/)).toBeInTheDocument();
    });

    expect(importSelectFile).toHaveBeenCalledTimes(1);
    expect(previewImportTransactions).toHaveBeenCalledWith({ filePath: '/tmp/ops.csv' });
    expect(confirmImportTransactions).toHaveBeenCalledWith({ filePath: '/tmp/ops.csv' });
    expect(setInitialBalance).toHaveBeenCalledTimes(1);
    expect(generateAssetsReport).toHaveBeenCalledWith({ baseYear: 2025 });
  });
});

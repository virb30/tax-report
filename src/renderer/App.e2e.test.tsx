/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType, OperationType, SourceType } from '../shared/types/domain';
import { App } from './App';

describe('App critical UI flows (E2E)', () => {
  it('runs import, manual base and annual report flows through UI', async () => {
    const previewImportFromFile = jest.fn().mockResolvedValue({
      commands: [
        {
          tradeDate: '2025-03-10',
          broker: 'XP',
          sourceType: SourceType.Csv,
          totalOperationalCosts: 1,
          operations: [
            {
              ticker: 'PETR4',
              assetType: AssetType.Stock,
              operationType: OperationType.Buy,
              quantity: 10,
              unitPrice: 20,
              irrfWithheld: 0,
            },
          ],
        },
      ],
    });
    const confirmImportOperations = jest.fn().mockResolvedValue({
      createdOperationsCount: 1,
      recalculatedPositionsCount: 1,
    });
    const setManualBase = jest.fn().mockResolvedValue({
      ticker: 'IVVB11',
      broker: 'XP',
      quantity: 2,
      averagePrice: 300,
      isManualBase: true,
    });
    const listPositions = jest
      .fn()
      .mockResolvedValueOnce({
        items: [],
      })
      .mockResolvedValueOnce({
        items: [
          {
            ticker: 'IVVB11',
            broker: 'XP',
            assetType: AssetType.Etf,
            quantity: 2,
            averagePrice: 300,
            totalCost: 600,
            isManualBase: true,
          },
        ],
      });
    const generateAssetsReport = jest.fn().mockResolvedValue({
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
    });

    window.electronApi = {
      appName: 'tax-report',
      previewImportFromFile,
      importOperations: jest.fn(),
      confirmImportOperations,
      setManualBase,
      listPositions,
      generateAssetsReport,
    };

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText('/caminho/arquivo.csv'), '/tmp/ops.csv');
    await user.click(screen.getByRole('button', { name: 'Conferir arquivo' }));
    await waitFor(() => {
      expect(screen.getByText('Conferencia pronta: 1 notas e 1 operacoes.')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Confirmar importacao' }));
    await waitFor(() => {
      expect(screen.getByText(/Importacao concluida/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Gerenciar Preco Medio' }));
    await user.type(screen.getByLabelText('Ticker'), 'IVVB11');
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.clear(screen.getByLabelText('Preco medio'));
    await user.type(screen.getByLabelText('Preco medio'), '300');
    await user.click(screen.getByRole('button', { name: 'Salvar base manual' }));
    await waitFor(() => {
      expect(screen.getByText('Base manual salva com sucesso.')).toBeInTheDocument();
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

    expect(previewImportFromFile).toHaveBeenCalledWith({
      broker: 'XP',
      filePath: '/tmp/ops.csv',
    });
    expect(confirmImportOperations).toHaveBeenCalledTimes(1);
    expect(setManualBase).toHaveBeenCalledTimes(1);
    expect(generateAssetsReport).toHaveBeenCalledWith({ baseYear: 2025 });
  });
});

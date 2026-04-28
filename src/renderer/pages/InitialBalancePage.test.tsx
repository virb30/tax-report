import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '../../shared/types/domain';
import type { ListPositionsResult } from '../../shared/contracts/list-positions.contract';
import type { ElectronApi } from '../../shared/types/electron-api';
import { InitialBalancePage } from './InitialBalancePage';
import { listActiveBrokers } from '../services/api/list-brokers';
import { mockReset } from 'jest-mock-extended';
import mock, { type MockProxy } from 'jest-mock-extended/lib/Mock';

jest.mock('../services/api/list-brokers', () => ({
  listActiveBrokers: jest.fn(),
}));

const mockedListActiveBrokers = jest.mocked(listActiveBrokers);

function getSelect(label: string): HTMLSelectElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Expected "${label}" to be a select element.`);
  }

  return element;
}

function getInput(label: string): HTMLInputElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected "${label}" to be an input element.`);
  }

  return element;
}

function getButton(name: string): HTMLButtonElement {
  const element = screen.getByRole('button', { name });
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be a button element.`);
  }

  return element;
}

function createElectronApiMock(electronApiBaseMock: MockProxy<ElectronApi>): ElectronApi {
  mockReset(electronApiBaseMock);
  return {
    appName: 'tax-report',
    importSelectFile: electronApiBaseMock.importSelectFile,
    previewImportTransactions: electronApiBaseMock.previewImportTransactions,
    confirmImportTransactions: electronApiBaseMock.confirmImportTransactions,
    setInitialBalance: electronApiBaseMock.setInitialBalance,
    listPositions: electronApiBaseMock.listPositions,
    generateAssetsReport: electronApiBaseMock.generateAssetsReport,
    listBrokers: electronApiBaseMock.listBrokers,
    createBroker: electronApiBaseMock.createBroker,
    updateBroker: electronApiBaseMock.updateBroker,
    toggleBrokerActive: electronApiBaseMock.toggleBrokerActive,
    recalculatePosition: electronApiBaseMock.recalculatePosition,
    migrateYear: electronApiBaseMock.migrateYear,
    previewConsolidatedPosition: electronApiBaseMock.previewConsolidatedPosition,
    importConsolidatedPosition: electronApiBaseMock.importConsolidatedPosition,
    deletePosition: electronApiBaseMock.deletePosition,
  };
}

describe('InitialBalancePage', () => {
  const electronApi = mock<ElectronApi>();
  let windowElectronApi: ElectronApi;

  beforeEach(() => {
    windowElectronApi = createElectronApiMock(electronApi);
    window.electronApi = windowElectronApi;
  });

  it('loads brokers and positions on mount', async () => {
    const positionsResult: ListPositionsResult = {
      ok: true,
      data: {
        items: [
          {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 10,
            averagePrice: 30,
            totalCost: 300,
            brokerBreakdown: [],
          },
        ],
      },
    };

    mockedListActiveBrokers.mockResolvedValue([
      { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', code: 'XP', active: true },
    ]);
    jest.mocked(electronApi.listPositions).mockResolvedValue(positionsResult);

    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora').value).toBe('broker-xp');
    });
    expect(screen.getByText('PETR4')).toBeTruthy();
    expect(electronApi.listPositions).toHaveBeenCalledWith(
      expect.objectContaining({ baseYear: expect.any(Number) }),
    );
  });

  it('keeps save disabled until a broker is selected', async () => {
    mockedListActiveBrokers.mockResolvedValue([
      { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', code: 'XP', active: true },
    ]);
    jest.mocked(electronApi.listPositions).mockResolvedValue({ ok: true, data: { items: [] } });

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(electronApi.listPositions).toHaveBeenCalledTimes(1);
    });

    const brokerSelect = getSelect('Corretora');
    const saveButton = getButton('Salvar saldo inicial');

    await user.selectOptions(brokerSelect, 'broker-xp');
    await user.type(getInput('Ticker'), 'PETR4');
    await user.type(getInput('Quantidade'), '0');
    await user.type(getInput('Preço médio (R$)'), '10');
    expect(saveButton.disabled).toBe(false);

    await user.selectOptions(brokerSelect, '');
    expect(saveButton.disabled).toBe(true);
    expect(electronApi.setInitialBalance).not.toHaveBeenCalled();
  });

  it('saves initial balance, clears form and reloads positions', async () => {
    mockedListActiveBrokers.mockResolvedValue([
      { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', code: 'XP', active: true },
    ]);
    jest
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              ticker: 'IVVB11',
              assetType: AssetType.Etf,
              totalQuantity: 2,
              averagePrice: 300,
              totalCost: 600,
              brokerBreakdown: [],
            },
          ],
        },
      });
    jest.mocked(electronApi.setInitialBalance).mockResolvedValue({
      ok: true,
      data: {
        ticker: 'IVVB11',
        brokerId: 'broker-xp',
        quantity: 2,
        averagePrice: 300,
      },
    });

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora').value).toBe('broker-xp');
    });

    await user.type(getInput('Ticker'), 'ivvb11');
    await user.type(getInput('Quantidade'), '2');
    await user.type(getInput('Preço médio (R$)'), '300');
    await user.click(getButton('Salvar saldo inicial'));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial cadastrado com sucesso.')).toBeTruthy();
    });
    expect(electronApi.setInitialBalance).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'IVVB11',
        brokerId: 'broker-xp',
        assetType: AssetType.Stock,
        quantity: 2,
        averagePrice: 300,
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('IVVB11')).toBeTruthy();
    });
    expect(getInput('Ticker').value).toBe('');
  });

  it('displays save failure messages from result envelopes', async () => {
    mockedListActiveBrokers.mockResolvedValue([
      { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', code: 'XP', active: true },
    ]);
    jest.mocked(electronApi.listPositions).mockResolvedValue({ ok: true, data: { items: [] } });
    jest.mocked(electronApi.setInitialBalance).mockResolvedValue({
      ok: false,
      error: {
        code: 'INITIAL_BALANCE_FAILED',
        kind: 'business',
        message: 'Saldo inicial não pôde ser salvo.',
      },
    });

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora').value).toBe('broker-xp');
    });

    await user.type(getInput('Ticker'), 'PETR4');
    await user.type(getInput('Quantidade'), '10');
    await user.type(getInput('Preço médio (R$)'), '30');
    await user.click(getButton('Salvar saldo inicial'));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial não pôde ser salvo.')).toBeTruthy();
    });
    expect(screen.queryByText('Saldo inicial cadastrado com sucesso.')).toBeNull();
  });
});

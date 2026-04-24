import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetType } from '../../shared/types/domain';
import type { ListPositionsResult } from '../../shared/contracts/list-positions.contract';
import type { ElectronApi } from '../../shared/types/electron-api';
import { PositionsPage } from './PositionsPage';

function getButton(name: string): HTMLButtonElement {
  const element = screen.getByRole('button', { name });
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be a button element.`);
  }

  return element;
}

function createElectronApiMock(): ElectronApi {
  return {
    appName: 'tax-report',
    importSelectFile: jest.fn<ElectronApi['importSelectFile']>(),
    previewImportTransactions: jest.fn<ElectronApi['previewImportTransactions']>(),
    confirmImportTransactions: jest.fn<ElectronApi['confirmImportTransactions']>(),
    setInitialBalance: jest.fn<ElectronApi['setInitialBalance']>(),
    listPositions: jest.fn<ElectronApi['listPositions']>(),
    generateAssetsReport: jest.fn<ElectronApi['generateAssetsReport']>(),
    listBrokers: jest.fn<ElectronApi['listBrokers']>(),
    createBroker: jest.fn<ElectronApi['createBroker']>(),
    updateBroker: jest.fn<ElectronApi['updateBroker']>(),
    toggleBrokerActive: jest.fn<ElectronApi['toggleBrokerActive']>(),
    recalculatePosition: jest.fn<ElectronApi['recalculatePosition']>(),
    migrateYear: jest.fn<ElectronApi['migrateYear']>(),
    previewConsolidatedPosition: jest.fn<ElectronApi['previewConsolidatedPosition']>(),
    importConsolidatedPosition: jest.fn<ElectronApi['importConsolidatedPosition']>(),
    deletePosition: jest.fn<ElectronApi['deletePosition']>(),
  };
}

function createPositionsResult(): ListPositionsResult {
  return {
    items: [
      {
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        totalQuantity: 10,
        averagePrice: 30,
        totalCost: 300,
        brokerBreakdown: [
          {
            brokerId: 'broker-xp',
            brokerName: 'XP',
            brokerCnpj: '00.000.000/0001-00',
            quantity: 10,
          },
        ],
      },
      {
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        totalQuantity: 5,
        averagePrice: 60,
        totalCost: 300,
        brokerBreakdown: [],
      },
    ],
  };
}

describe('PositionsPage', () => {
  let electronApi: ElectronApi;

  beforeEach(() => {
    electronApi = createElectronApiMock();
    window.electronApi = electronApi;
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('loads positions and expands broker breakdown details', async () => {
    jest.mocked(electronApi.listPositions).mockResolvedValue(createPositionsResult());

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    await user.click(screen.getByText('PETR4'));

    expect(screen.getByText('Por corretora')).toBeTruthy();
    expect(screen.getByText('XP')).toBeTruthy();
    expect(screen.getByText('00.000.000/0001-00')).toBeTruthy();
  });

  it('recalculates all positions and reloads the list', async () => {
    jest
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce(createPositionsResult())
      .mockResolvedValueOnce(createPositionsResult());
    jest.mocked(electronApi.recalculatePosition).mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<PositionsPage />);

    const recalculateAllButton = getButton('Recalcular todas');
    await waitFor(() => {
      expect(recalculateAllButton.disabled).toBe(false);
    });

    await user.click(recalculateAllButton);

    await waitFor(() => {
      expect(electronApi.recalculatePosition).toHaveBeenCalledTimes(2);
    });
    expect(electronApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
    );
    expect(electronApi.recalculatePosition).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'VALE3', year: expect.any(Number) }),
    );
    expect(electronApi.listPositions).toHaveBeenCalledTimes(2);
  });

  it('deletes a position after confirmation and reloads the list', async () => {
    const positionsResult = createPositionsResult();
    const remainingPosition = positionsResult.items[1];
    if (remainingPosition == null) {
      throw new Error('Expected a second position in the fixture.');
    }

    jest
      .mocked(electronApi.listPositions)
      .mockResolvedValueOnce(positionsResult)
      .mockResolvedValueOnce({
        items: [remainingPosition],
      });
    jest.mocked(electronApi.deletePosition).mockResolvedValue({ deleted: true });

    const user = userEvent.setup();
    render(<PositionsPage />);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });

    const deleteButton = screen.getAllByRole('button', { name: 'Excluir' })[0];
    if (!(deleteButton instanceof HTMLButtonElement)) {
      throw new Error('Expected delete control to be a button element.');
    }

    await user.click(deleteButton);

    await waitFor(() => {
      expect(electronApi.deletePosition).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'PETR4', year: expect.any(Number) }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('PETR4')).toBeNull();
    });
  });
});

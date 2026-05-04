import { ELECTRON_API_CHANNELS, REGISTERED_IPC_CHANNELS } from './ipc-channels';
import { ipcContracts, rendererExposedIpcContracts } from './ipc-contract-registry';
import { appIpcContracts } from '../contracts/app';
import { assetIpcContracts } from '../contracts/portfolio/assets';
import { brokerIpcContracts } from '../contracts/portfolio/brokers';
import { importIpcContracts } from '../contracts/ingestion/import';
import { portfolioIpcContracts } from '../contracts/portfolio/portfolio';
import { reportIpcContracts } from '../contracts/tax-reporting/report';

function expectUnique(values: string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe('ipc contract registry', () => {
  it('keeps contract channels unique', () => {
    expectUnique(ipcContracts.map((contract) => contract.channel));
  });

  it('keeps renderer API names unique for exposed contracts', () => {
    const apiNames = rendererExposedIpcContracts.map((contract) => contract.api?.name);

    expect(apiNames).not.toContain(undefined);
    expectUnique(apiNames.filter((name): name is string => name !== undefined));
  });

  it('registers every current preload channel as a renderer-exposed contract', () => {
    expect(new Set(rendererExposedIpcContracts.map((contract) => contract.channel))).toEqual(
      new Set(Object.values(ELECTRON_API_CHANNELS)),
    );
  });

  it('derives compatibility channel exports from contracts', () => {
    const electronApiChannels: Record<string, string> = {};

    for (const contract of rendererExposedIpcContracts) {
      if (contract.api !== undefined) {
        electronApiChannels[contract.api.name] = contract.channel;
      }
    }

    expect(REGISTERED_IPC_CHANNELS).toEqual(ipcContracts.map((contract) => contract.channel));
    expect(ELECTRON_API_CHANNELS).toEqual(electronApiChannels);
  });

  it('marks every portfolio contract as result mode', () => {
    expect(portfolioIpcContracts.map((contract) => contract.errorMode)).toEqual(
      portfolioIpcContracts.map(() => 'result'),
    );
  });

  it('exposes the asset catalog contracts through the shared registry', () => {
    expect(
      assetIpcContracts.map((contract) => ({
        apiName: contract.api?.name,
        channel: contract.channel,
        id: contract.id,
      })),
    ).toEqual([
      {
        apiName: 'listAssets',
        channel: 'assets:list',
        id: 'assets.list',
      },
      {
        apiName: 'updateAsset',
        channel: 'assets:update',
        id: 'assets.update',
      },
      {
        apiName: 'repairAssetType',
        channel: 'assets:repair-type',
        id: 'assets.repairType',
      },
    ]);
  });

  it('exposes only approved MVP portfolio contracts', () => {
    expect(
      portfolioIpcContracts.map((contract) => ({
        apiName: contract.api?.name,
        channel: contract.channel,
        id: contract.id,
      })),
    ).toEqual([
      {
        apiName: 'saveInitialBalanceDocument',
        channel: 'portfolio:save-initial-balance-document',
        id: 'portfolio.saveInitialBalanceDocument',
      },
      {
        apiName: 'listInitialBalanceDocuments',
        channel: 'portfolio:list-initial-balance-documents',
        id: 'portfolio.listInitialBalanceDocuments',
      },
      {
        apiName: 'deleteInitialBalanceDocument',
        channel: 'portfolio:delete-initial-balance-document',
        id: 'portfolio.deleteInitialBalanceDocument',
      },
      {
        apiName: 'listPositions',
        channel: 'portfolio:list-positions',
        id: 'portfolio.listPositions',
      },
      {
        apiName: 'recalculatePosition',
        channel: 'portfolio:recalculate',
        id: 'portfolio.recalculate',
      },
      {
        apiName: 'migrateYear',
        channel: 'portfolio:migrate-year',
        id: 'portfolio.migrateYear',
      },
      {
        apiName: 'previewConsolidatedPosition',
        channel: 'portfolio:preview-consolidated-position',
        id: 'portfolio.previewConsolidatedPosition',
      },
      {
        apiName: 'importConsolidatedPosition',
        channel: 'portfolio:import-consolidated-position',
        id: 'portfolio.importConsolidatedPosition',
      },
      {
        apiName: 'deletePosition',
        channel: 'portfolio:delete-position',
        id: 'portfolio.deletePosition',
      },
      {
        apiName: 'deleteAllPositions',
        channel: 'portfolio:delete-all-positions',
        id: 'portfolio.deleteAllPositions',
      },
    ]);
  });

  it('does not broadly migrate non-portfolio contract groups to result mode', () => {
    expect(appIpcContracts.map((contract) => contract.errorMode)).toEqual(['throw']);
    expect(importIpcContracts.map((contract) => contract.errorMode)).toEqual(
      importIpcContracts.map(() => 'throw'),
    );
    expect(reportIpcContracts.map((contract) => contract.errorMode)).toEqual(['throw']);
    expect(brokerIpcContracts.map((contract) => contract.errorMode)).toEqual([
      'throw',
      'result',
      'result',
      'result',
    ]);
    expect(assetIpcContracts.map((contract) => contract.errorMode)).toEqual([
      'throw',
      'result',
      'result',
    ]);
  });
});

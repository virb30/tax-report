import { appIpcContracts } from '../contracts/app/contracts';
import { assetIpcContracts } from '../contracts/portfolio/assets/contracts';
import { brokerIpcContracts } from '../contracts/portfolio/brokers/contracts';
import { importIpcContracts } from '../contracts/ingestion/import/contracts';
import { monthlyCloseIpcContracts } from '../contracts/tax-reporting/monthly-close/contracts';
import { portfolioIpcContracts } from '../contracts/portfolio/portfolio/contracts';
import { reportIpcContracts } from '../contracts/tax-reporting/report/contracts';
import type { IpcContractDefinition } from '../contract-types';
import type { z } from 'zod';

type IpcContract = IpcContractDefinition<z.ZodType, unknown, string, string>;

type RendererExposedIpcContract = IpcContractDefinition<z.ZodType, unknown> & {
  exposeToRenderer: true;
  api: {
    name: string;
  };
};

function isRendererExposedContract(
  contract: IpcContractDefinition<z.ZodType, unknown>,
): contract is RendererExposedIpcContract {
  return contract.exposeToRenderer && contract.api !== undefined;
}

function assertUniqueContractProperty(
  contracts: readonly IpcContract[],
  getValue: (contract: IpcContract) => string | undefined,
  label: string,
): void {
  const values = new Set<string>();

  for (const contract of contracts) {
    const value = getValue(contract);

    if (value === undefined) {
      continue;
    }

    if (values.has(value)) {
      throw new Error(`Duplicate IPC contract ${label}: ${value}`);
    }

    values.add(value);
  }
}

export function assertUniqueIpcContractMetadata(contracts: readonly IpcContract[]): void {
  assertUniqueContractProperty(contracts, (contract) => contract.channel, 'channel');
  assertUniqueContractProperty(
    contracts.filter(isRendererExposedContract),
    (contract) => contract.api?.name,
    'renderer API name',
  );
}

export const ipcContracts: readonly IpcContract[] = [
  ...appIpcContracts,
  ...importIpcContracts,
  ...portfolioIpcContracts,
  ...reportIpcContracts,
  ...monthlyCloseIpcContracts,
  ...brokerIpcContracts,
  ...assetIpcContracts,
] as const;

assertUniqueIpcContractMetadata(ipcContracts);

export const rendererExposedIpcContracts = ipcContracts.filter(isRendererExposedContract);

import { appIpcContracts } from '../contracts/app/contracts';
import { assetIpcContracts } from '../contracts/portfolio/assets/contracts';
import { brokerIpcContracts } from '../contracts/portfolio/brokers/contracts';
import { importIpcContracts } from '../contracts/ingestion/import/contracts';
import { portfolioIpcContracts } from '../contracts/portfolio/portfolio/contracts';
import { reportIpcContracts } from '../contracts/tax-reporting/report/contracts';
import type { IpcContractDefinition } from './contract-types';
import type { z } from 'zod';

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

export const ipcContracts: readonly IpcContractDefinition<z.ZodType, unknown, string, string>[] = [
  ...appIpcContracts,
  ...importIpcContracts,
  ...portfolioIpcContracts,
  ...reportIpcContracts,
  ...brokerIpcContracts,
  ...assetIpcContracts,
] as const;

export const rendererExposedIpcContracts = ipcContracts.filter(isRendererExposedContract);

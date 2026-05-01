import { appIpcContracts } from './app/contracts';
import { assetIpcContracts } from './assets/contracts';
import { brokerIpcContracts } from './brokers/contracts';
import { importIpcContracts } from './import/contracts';
import { portfolioIpcContracts } from './portfolio/contracts';
import { reportIpcContracts } from './report/contracts';
import type { IpcContractDefinition } from '../contract-types';
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

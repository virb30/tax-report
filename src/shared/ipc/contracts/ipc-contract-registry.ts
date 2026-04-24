import { appIpcContracts } from './app';
import { brokerIpcContracts } from './brokers';
import { importIpcContracts } from './import';
import { portfolioIpcContracts } from './portfolio';
import { reportIpcContracts } from './report';
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

export const ipcContracts = [
  ...appIpcContracts,
  ...importIpcContracts,
  ...portfolioIpcContracts,
  ...reportIpcContracts,
  ...brokerIpcContracts,
] as const;

export const rendererExposedIpcContracts = ipcContracts.filter(isRendererExposedContract);

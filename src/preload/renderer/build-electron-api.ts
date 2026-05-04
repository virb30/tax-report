import type { z } from 'zod';
import type { IpcContractDefinition } from '../ipc/contract-types';

type RendererIpcInvoker = {
  invoke(channel: string): Promise<unknown>;
  invoke(channel: string, input: unknown): Promise<unknown>;
};

type ElectronApiShape = Record<string, string | ((input?: unknown) => Promise<unknown>)>;

function assertUniqueContractMetadata(
  contracts: readonly IpcContractDefinition<z.ZodType, unknown>[],
): void {
  const apiNames = new Set<string>();
  const channels = new Set<string>();

  for (const contract of contracts) {
    if (!contract.exposeToRenderer || contract.api === undefined) {
      throw new Error(`Contract is not renderer-exposed: ${contract.id}`);
    }
    const api = contract.api;

    if (apiNames.has(api.name)) {
      throw new Error(`Duplicate renderer API name: ${api.name}`);
    }
    if (channels.has(contract.channel)) {
      throw new Error(`Duplicate renderer IPC channel: ${contract.channel}`);
    }

    apiNames.add(api.name);
    channels.add(contract.channel);
  }
}

export function buildElectronApi(
  ipcRenderer: RendererIpcInvoker,
  contracts: readonly IpcContractDefinition<z.ZodType, unknown>[],
): ElectronApiShape {
  assertUniqueContractMetadata(contracts);

  const api: ElectronApiShape = {
    appName: 'tax-report',
  };

  for (const contract of contracts) {
    if (contract.api === undefined) {
      throw new Error(`Contract is not renderer-exposed: ${contract.id}`);
    }
    const apiName = contract.api.name;

    api[apiName] = (input?: unknown) => {
      if (input === undefined) {
        return ipcRenderer.invoke(contract.channel);
      }

      return ipcRenderer.invoke(contract.channel, input);
    };
  }

  return api;
}

import type { z } from 'zod';
import type {
  IpcContractDefinition,
  IpcContractInput,
  IpcContractOutput,
} from '../../../shared/ipc/contract-types';
import type { IpcMainHandleRegistry } from '../registry/ipc-registrar';
import { toIpcResultFailure } from './ipc-error-mapper';
import { parseIpcPayload } from './ipc-payload';

type BoundIpcContract = IpcContractDefinition<z.ZodType, unknown>;

export type IpcContractHandler<TContract extends BoundIpcContract> = (
  payload: IpcContractInput<TContract>,
) => Promise<IpcContractOutput<TContract>> | IpcContractOutput<TContract>;

export type BindIpcContractOptions<TContract extends BoundIpcContract> = {
  onError?: (error: unknown) => IpcContractOutput<TContract>;
};

export function bindIpcContract<TContract extends BoundIpcContract>(
  ipcMain: IpcMainHandleRegistry,
  contract: TContract,
  handler: IpcContractHandler<TContract>,
  options: BindIpcContractOptions<TContract> = {},
): void {
  ipcMain.handle(contract.channel, async (_event, input: unknown) => {
    try {
      const payload = parseIpcPayload(contract.inputSchema, input, {
        payloadErrorMessage: contract.payloadErrorMessage,
        requireObjectInput: contract.requireObjectInput,
      });

      return await handler(payload as IpcContractInput<TContract>);
    } catch (error) {
      if (contract.errorMode === 'result') {
        return options.onError
          ? options.onError(error)
          : (toIpcResultFailure(error) as IpcContractOutput<TContract>);
      }

      throw error;
    }
  });
}

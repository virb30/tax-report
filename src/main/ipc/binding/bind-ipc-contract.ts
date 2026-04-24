import type { z } from 'zod';
import type {
  IpcContractDefinition,
  IpcContractInput,
  IpcContractOutput,
} from '../../../shared/ipc/contract-types';
import { parseIpcPayload } from '../controllers/ipc-handler.utils';
import type { IpcMainHandleRegistry } from '../controllers/ipc-controller.interface';

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
      if (contract.errorMode === 'result' && options.onError) {
        return options.onError(error);
      }

      throw error;
    }
  });
}

import type { ListAssetsUseCase } from '../../application/use-cases/list-assets/list-assets.use-case';
import type { UpdateAssetUseCase } from '../../application/use-cases/update-asset/update-asset.use-case';
import { bindIpcContract } from '../binding/bind-ipc-contract';
import { toIpcFailureResult } from '../binding/ipc-error-mapper';
import { createAssetIpcHandlers } from '../handlers/assets/asset-ipc-handlers';
import {
  assetIpcContracts,
  listAssetsContract,
  updateAssetContract,
} from '../../../shared/ipc/contracts/assets';
import type { IpcMainHandleRegistry, IpcRegistrar } from '../registry/ipc-registrar';

export class AssetsIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly listAssetsUseCase: ListAssetsUseCase,
    private readonly updateAssetUseCase: UpdateAssetUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createAssetIpcHandlers(this.listAssetsUseCase, this.updateAssetUseCase);

    bindIpcContract(ipcMain, listAssetsContract, handlers.list);

    bindIpcContract(ipcMain, updateAssetContract, handlers.update, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao atualizar ativo.');
      },
    });

    return assetIpcContracts.map((contract) => contract.channel);
  }
}

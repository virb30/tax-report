import type { ListAssetsUseCase } from '../../application/use-cases/list-assets.use-case';
import type { RepairAssetTypeUseCase } from '../../application/use-cases/repair-asset-type.use-case';
import type { UpdateAssetUseCase } from '../../application/use-cases/update-asset.use-case';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { toIpcFailureResult } from '../../../../preload/main/binding/ipc-error-mapper';
import { createAssetIpcHandlers } from '../handlers/assets/asset-ipc-handlers';
import {
  assetIpcContracts,
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../../../../preload/contracts/portfolio/assets';
import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';

export class AssetsIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly listAssetsUseCase: ListAssetsUseCase,
    private readonly updateAssetUseCase: UpdateAssetUseCase,
    private readonly repairAssetTypeUseCase: RepairAssetTypeUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createAssetIpcHandlers(
      this.listAssetsUseCase,
      this.updateAssetUseCase,
      this.repairAssetTypeUseCase,
    );

    bindIpcContract(ipcMain, listAssetsContract, handlers.list);

    bindIpcContract(ipcMain, updateAssetContract, handlers.update, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao atualizar ativo.');
      },
    });

    bindIpcContract(ipcMain, repairAssetTypeContract, handlers.repairType, {
      onError: (error) => {
        console.error(error);
        return toIpcFailureResult(error, 'Erro ao corrigir tipo do ativo.');
      },
    });

    return assetIpcContracts.map((contract) => contract.channel);
  }
}

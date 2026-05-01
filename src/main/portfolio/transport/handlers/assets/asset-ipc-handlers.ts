import type { ListAssetsUseCase } from '../../../application/use-cases/list-assets/list-assets.use-case';
import type { RepairAssetTypeUseCase } from '../../../application/use-cases/repair-asset-type/repair-asset-type.use-case';
import type { UpdateAssetUseCase } from '../../../application/use-cases/update-asset/update-asset.use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type {
  listAssetsContract,
  repairAssetTypeContract,
  updateAssetContract,
} from '../../../../../preload/contracts/portfolio/assets';

export type AssetIpcHandlers = {
  list: IpcContractHandler<typeof listAssetsContract>;
  update: IpcContractHandler<typeof updateAssetContract>;
  repairType: IpcContractHandler<typeof repairAssetTypeContract>;
};

export function createAssetIpcHandlers(
  listAssetsUseCase: ListAssetsUseCase,
  updateAssetUseCase: UpdateAssetUseCase,
  repairAssetTypeUseCase: RepairAssetTypeUseCase,
): AssetIpcHandlers {
  return {
    list: (payload) => listAssetsUseCase.execute(payload),
    update: async (payload) => {
      const asset = await updateAssetUseCase.execute(payload);
      return { success: true as const, asset };
    },
    repairType: async (payload) => {
      const repair = await repairAssetTypeUseCase.execute(payload);
      return { success: true as const, repair };
    },
  };
}

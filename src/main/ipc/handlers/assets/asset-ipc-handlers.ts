import type { ListAssetsUseCase } from '../../../application/use-cases/list-assets/list-assets.use-case';
import type { UpdateAssetUseCase } from '../../../application/use-cases/update-asset/update-asset.use-case';
import type { IpcContractHandler } from '../../binding/bind-ipc-contract';
import type {
  listAssetsContract,
  updateAssetContract,
} from '../../../../shared/ipc/contracts/assets';

export type AssetIpcHandlers = {
  list: IpcContractHandler<typeof listAssetsContract>;
  update: IpcContractHandler<typeof updateAssetContract>;
};

export function createAssetIpcHandlers(
  listAssetsUseCase: ListAssetsUseCase,
  updateAssetUseCase: UpdateAssetUseCase,
): AssetIpcHandlers {
  return {
    list: (payload) => listAssetsUseCase.execute(payload),
    update: async (payload) => {
      const asset = await updateAssetUseCase.execute(payload);
      return { success: true as const, asset };
    },
  };
}

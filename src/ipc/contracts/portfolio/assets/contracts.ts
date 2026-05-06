import { z } from 'zod';
import type {
  ListAssetsResult,
  RepairAssetTypeResult,
  UpdateAssetResult,
} from '../assets.contract';
import { AssetType } from '../../domain';
import { defineIpcContract } from '../../../define-ipc-contract';

export const listAssetsSchema = z
  .object({
    pendingOnly: z.boolean().optional(),
    reportBlockingOnly: z.boolean().optional(),
  })
  .optional()
  .catch(undefined);

export const updateAssetSchema = z
  .object({
    ticker: z.string().trim().min(1, 'Invalid ticker for update asset.'),
    assetType: z.nativeEnum(AssetType).optional(),
    name: z.string().trim().min(1, 'Invalid name for update asset.').optional(),
    cnpj: z.string().trim().min(1, 'Invalid CNPJ for update asset.').optional(),
  })
  .refine(
    (data) => data.assetType !== undefined || data.name !== undefined || data.cnpj !== undefined,
    {
      message: 'At least one asset field must be informed for update.',
      path: ['ticker'],
    },
  );

export const listAssetsContract = defineIpcContract<ListAssetsResult>()({
  id: 'assets.list',
  channel: 'assets:list',
  inputSchema: listAssetsSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'listAssets' },
  requireObjectInput: false,
});

export const updateAssetContract = defineIpcContract<UpdateAssetResult>()({
  id: 'assets.update',
  channel: 'assets:update',
  inputSchema: updateAssetSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'updateAsset' },
  payloadErrorMessage: 'Invalid payload for update asset.',
});

export const repairAssetTypeSchema = z.object({
  ticker: z.string().trim().min(1, 'Invalid ticker for repair asset type.'),
  assetType: z.enum(AssetType),
});

export const repairAssetTypeContract = defineIpcContract<RepairAssetTypeResult>()({
  id: 'assets.repairType',
  channel: 'assets:repair-type',
  inputSchema: repairAssetTypeSchema,
  errorMode: 'result',
  exposeToRenderer: true,
  api: { name: 'repairAssetType' },
  payloadErrorMessage: 'Invalid payload for repair asset type.',
});

export const assetIpcContracts = [
  listAssetsContract,
  updateAssetContract,
  repairAssetTypeContract,
] as const;

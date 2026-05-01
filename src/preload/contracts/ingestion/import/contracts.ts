import { z } from 'zod';
import type {
  ConfirmImportTransactionsResult,
  PreviewImportTransactionsResult,
} from '../preview-import.contract';
import { AssetType } from '../../../../shared/types/domain';
import { defineIpcContract } from '../../../ipc/define-ipc-contract';

export type ImportSelectFileResult = {
  filePath: string | null;
};

export const importSelectFileSchema = z.void();

export const previewImportTransactionsSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for preview import transactions.' })
    .trim()
    .min(1, 'Invalid file path for preview import transactions.'),
});

const assetTypeOverrideSchema = z.object({
  ticker: z
    .string({ message: 'Invalid ticker for import asset type override.' })
    .trim()
    .min(1, 'Invalid ticker for import asset type override.'),
  assetType: z.nativeEnum(AssetType, {
    message: 'Invalid asset type for import asset type override.',
  }),
});

export const confirmImportTransactionsSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for confirm import transactions.' })
    .trim()
    .min(1, 'Invalid file path for confirm import transactions.'),
  assetTypeOverrides: z.array(assetTypeOverrideSchema),
});

export const importSelectFileContract = defineIpcContract<ImportSelectFileResult>()({
  id: 'import.selectFile',
  channel: 'import:select-file',
  inputSchema: importSelectFileSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'importSelectFile' },
  requireObjectInput: false,
});

export const previewImportTransactionsContract =
  defineIpcContract<PreviewImportTransactionsResult>()({
    id: 'import.previewTransactions',
    channel: 'import:preview-transactions',
    inputSchema: previewImportTransactionsSchema,
    errorMode: 'throw',
    exposeToRenderer: true,
    api: { name: 'previewImportTransactions' },
    payloadErrorMessage: 'Invalid payload for preview import transactions.',
  });

export const confirmImportTransactionsContract =
  defineIpcContract<ConfirmImportTransactionsResult>()({
    id: 'import.confirmTransactions',
    channel: 'import:confirm-transactions',
    inputSchema: confirmImportTransactionsSchema,
    errorMode: 'throw',
    exposeToRenderer: true,
    api: { name: 'confirmImportTransactions' },
    payloadErrorMessage: 'Invalid payload for confirm import transactions.',
  });

export const importIpcContracts = [
  importSelectFileContract,
  previewImportTransactionsContract,
  confirmImportTransactionsContract,
] as const;

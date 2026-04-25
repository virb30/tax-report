import { z } from 'zod';
import type {
  ConfirmImportTransactionsResult,
  PreviewImportTransactionsResult,
} from '../../../contracts/preview-import.contract';
import { defineIpcContract } from '../../define-ipc-contract';

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

export const confirmImportTransactionsSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for confirm import transactions.' })
    .trim()
    .min(1, 'Invalid file path for confirm import transactions.'),
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

import { z } from 'zod';
import type {
  ConfirmImportTransactionsResult,
  PreviewImportTransactionsResult,
} from '../preview-import.contract';
import type {
  DeleteDailyBrokerTaxResult,
  ImportDailyBrokerTaxesResult,
  ListDailyBrokerTaxesResult,
  SaveDailyBrokerTaxResult,
} from '../daily-broker-tax.contract';
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

export const listDailyBrokerTaxesSchema = z.void();

export const saveDailyBrokerTaxSchema = z.object({
  date: z
    .string({ message: 'Invalid date for daily broker tax.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date for daily broker tax.'),
  brokerId: z
    .string({ message: 'Invalid broker for daily broker tax.' })
    .trim()
    .min(1, 'Invalid broker for daily broker tax.'),
  fees: z
    .number({ message: 'Invalid fees for daily broker tax.' })
    .finite('Invalid fees for daily broker tax.')
    .nonnegative('Invalid fees for daily broker tax.'),
  irrf: z
    .number({ message: 'Invalid IRRF for daily broker tax.' })
    .finite('Invalid IRRF for daily broker tax.')
    .nonnegative('Invalid IRRF for daily broker tax.'),
});

export const importDailyBrokerTaxesSchema = z.object({
  filePath: z
    .string({ message: 'Invalid file path for daily broker tax import.' })
    .trim()
    .min(1, 'Invalid file path for daily broker tax import.'),
});

export const deleteDailyBrokerTaxSchema = z.object({
  date: z
    .string({ message: 'Invalid date for daily broker tax deletion.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date for daily broker tax deletion.'),
  brokerId: z
    .string({ message: 'Invalid broker for daily broker tax deletion.' })
    .trim()
    .min(1, 'Invalid broker for daily broker tax deletion.'),
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

export const listDailyBrokerTaxesContract = defineIpcContract<ListDailyBrokerTaxesResult>()({
  id: 'import.listDailyBrokerTaxes',
  channel: 'import:list-daily-broker-taxes',
  inputSchema: listDailyBrokerTaxesSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'listDailyBrokerTaxes' },
  requireObjectInput: false,
});

export const saveDailyBrokerTaxContract = defineIpcContract<SaveDailyBrokerTaxResult>()({
  id: 'import.saveDailyBrokerTax',
  channel: 'import:save-daily-broker-tax',
  inputSchema: saveDailyBrokerTaxSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'saveDailyBrokerTax' },
  payloadErrorMessage: 'Invalid payload for save daily broker tax.',
});

export const importDailyBrokerTaxesContract = defineIpcContract<ImportDailyBrokerTaxesResult>()({
  id: 'import.importDailyBrokerTaxes',
  channel: 'import:import-daily-broker-taxes',
  inputSchema: importDailyBrokerTaxesSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'importDailyBrokerTaxes' },
  payloadErrorMessage: 'Invalid payload for import daily broker taxes.',
});

export const deleteDailyBrokerTaxContract = defineIpcContract<DeleteDailyBrokerTaxResult>()({
  id: 'import.deleteDailyBrokerTax',
  channel: 'import:delete-daily-broker-tax',
  inputSchema: deleteDailyBrokerTaxSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'deleteDailyBrokerTax' },
  payloadErrorMessage: 'Invalid payload for delete daily broker tax.',
});

export const importIpcContracts = [
  importSelectFileContract,
  previewImportTransactionsContract,
  confirmImportTransactionsContract,
  listDailyBrokerTaxesContract,
  saveDailyBrokerTaxContract,
  importDailyBrokerTaxesContract,
  deleteDailyBrokerTaxContract,
] as const;

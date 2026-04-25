import { z } from 'zod';
import type { GenerateAssetsReportResult } from '../../../contracts/assets-report.contract';
import { defineIpcContract } from '../../define-ipc-contract';

export const generateAssetsReportSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for assets report.' })
    .int('Invalid base year for assets report.'),
});

export const generateAssetsReportContract = defineIpcContract<GenerateAssetsReportResult>()({
  id: 'report.generateAssets',
  channel: 'report:assets-annual',
  inputSchema: generateAssetsReportSchema,
  errorMode: 'throw',
  exposeToRenderer: true,
  api: { name: 'generateAssetsReport' },
  payloadErrorMessage: 'Invalid payload for assets report.',
});

export const reportIpcContracts = [generateAssetsReportContract] as const;

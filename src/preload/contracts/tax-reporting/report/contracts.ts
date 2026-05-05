import { z } from 'zod';
import type { GenerateAssetsReportResult } from '../assets-report.contract';
import type { GenerateCapitalGainsAssessmentResult } from '../capital-gains-assessment.contract';
import { defineIpcContract } from '../../../ipc/define-ipc-contract';

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

export const generateCapitalGainsAssessmentSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for capital gains assessment.' })
    .int('Invalid base year for capital gains assessment.'),
});

export const generateCapitalGainsAssessmentContract =
  defineIpcContract<GenerateCapitalGainsAssessmentResult>()({
    id: 'report.generateCapitalGains',
    channel: 'tax-reporting:capital-gains-assessment',
    inputSchema: generateCapitalGainsAssessmentSchema,
    errorMode: 'throw',
    exposeToRenderer: true,
    api: { name: 'generateCapitalGainsAssessment' },
    payloadErrorMessage: 'Invalid payload for capital gains assessment.',
  });

export const reportIpcContracts = [
  generateAssetsReportContract,
  generateCapitalGainsAssessmentContract,
] as const;

import type { GenerateAssetsReportUseCase } from '../../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import type { GenerateCapitalGainsAssessmentUseCase } from '../../../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case';
import type { IpcContractHandler } from '../../../../../preload/main/binding/bind-ipc-contract';
import type {
  generateAssetsReportContract,
  generateCapitalGainsAssessmentContract,
} from '../../../../../preload/contracts/tax-reporting/report';

export type ReportIpcHandlers = {
  generateAssetsReport: IpcContractHandler<typeof generateAssetsReportContract>;
  generateCapitalGainsAssessment: IpcContractHandler<typeof generateCapitalGainsAssessmentContract>;
};

export function createReportIpcHandlers(
  generateAssetsReportUseCase: GenerateAssetsReportUseCase,
  generateCapitalGainsAssessmentUseCase: GenerateCapitalGainsAssessmentUseCase,
): ReportIpcHandlers {
  return {
    generateAssetsReport: (payload) => generateAssetsReportUseCase.execute(payload),
    generateCapitalGainsAssessment: (payload) => generateCapitalGainsAssessmentUseCase.execute(payload),
  };
}

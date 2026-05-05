import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import type { GenerateCapitalGainsAssessmentUseCase } from '../../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { createReportIpcHandlers } from '../handlers/report/report-ipc-handlers';
import {
  generateAssetsReportContract,
  generateCapitalGainsAssessmentContract,
  reportIpcContracts,
} from '../../../../preload/contracts/tax-reporting/report';

export class ReportIpcRegistrar implements IpcRegistrar {
  constructor(
    private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase,
    private readonly generateCapitalGainsAssessmentUseCase: GenerateCapitalGainsAssessmentUseCase,
  ) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createReportIpcHandlers(
      this.generateAssetsReportUseCase,
      this.generateCapitalGainsAssessmentUseCase,
    );

    bindIpcContract(ipcMain, generateAssetsReportContract, handlers.generateAssetsReport);
    bindIpcContract(
      ipcMain,
      generateCapitalGainsAssessmentContract,
      handlers.generateCapitalGainsAssessment,
    );

    return reportIpcContracts.map((contract) => contract.channel);
  }
}

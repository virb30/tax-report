import type {
  IpcMainHandleRegistry,
  IpcRegistrar,
} from '../../../../preload/main/registry/ipc-registrar';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { bindIpcContract } from '../../../../preload/main/binding/bind-ipc-contract';
import { createReportIpcHandlers } from '../handlers/report/report-ipc-handlers';
import {
  generateAssetsReportContract,
  reportIpcContracts,
} from '../../../../preload/contracts/tax-reporting/report';

export class ReportIpcRegistrar implements IpcRegistrar {
  constructor(private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const handlers = createReportIpcHandlers(this.generateAssetsReportUseCase);

    bindIpcContract(ipcMain, generateAssetsReportContract, handlers.generateAssetsReport);

    return reportIpcContracts.map((contract) => contract.channel);
  }
}

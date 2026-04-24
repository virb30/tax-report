import { z } from 'zod';
import type { IpcController, IpcMainHandleRegistry } from './ipc-controller.interface';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { registerValidatedHandler } from './ipc-handler.utils';
import { REPORT_IPC_CHANNELS } from '../../../shared/ipc/ipc-channels';

const generateAssetsReportSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for assets report.' })
    .int('Invalid base year for assets report.'),
});

export class ReportController implements IpcController {
  constructor(private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase) {}

  register(ipcMain: IpcMainHandleRegistry): string[] {
    const channels = Object.values(REPORT_IPC_CHANNELS);

    registerValidatedHandler(ipcMain, {
      channel: REPORT_IPC_CHANNELS.assetsAnnual,
      schema: generateAssetsReportSchema,
      payloadErrorMessage: 'Invalid payload for assets report.',
      execute: (payload) => this.generateAssetsReportUseCase.execute(payload),
    });

    return channels;
  }
}

import { z } from 'zod';
import type { IpcController } from './ipc-controller.interface';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import { registerValidatedHandler } from './ipc-handler.utils';

const generateAssetsReportSchema = z.object({
  baseYear: z
    .number({ message: 'Invalid base year for assets report.' })
    .int('Invalid base year for assets report.'),
});

export class ReportController implements IpcController {
  constructor(private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = ['report:assets-annual'];

    registerValidatedHandler(ipcMain, {
      channel: 'report:assets-annual',
      schema: generateAssetsReportSchema,
      payloadErrorMessage: 'Invalid payload for assets report.',
      execute: (payload) => this.generateAssetsReportUseCase.execute(payload),
    });

    return channels;
  }
}

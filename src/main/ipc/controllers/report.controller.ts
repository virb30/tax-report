import { z } from 'zod';
import { IpcController } from './ipc-controller.interface';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';

function parseWith<T>(schema: z.ZodType<T>, input: unknown, payloadErrorMessage: string): T {
  if (!input || typeof input !== 'object') {
    throw new Error(payloadErrorMessage);
  }
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues?.[0]?.message || err.message;
      throw new Error(message);
    }
    throw err;
  }
}

const generateAssetsReportSchema = z.object({
  baseYear: z.number({ message: 'Invalid base year for assets report.' }).int('Invalid base year for assets report.'),
});

export class ReportController implements IpcController {
  constructor(
    private readonly generateAssetsReportUseCase: GenerateAssetsReportUseCase,
  ) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = ['report:assets-annual'];

    ipcMain.handle('report:assets-annual', async (_event, input: unknown) => {
      const payload = parseWith(generateAssetsReportSchema, input, 'Invalid payload for assets report.');
      return this.generateAssetsReportUseCase.execute(payload);
    });

    return channels;
  }
}

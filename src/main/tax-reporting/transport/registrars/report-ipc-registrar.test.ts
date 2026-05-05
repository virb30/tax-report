import { ReportIpcRegistrar } from './report-ipc-registrar';
import type { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-asset-report/generate-assets-report.use-case';
import type { GenerateCapitalGainsAssessmentUseCase } from '../../application/use-cases/generate-capital-gains-assessment/generate-capital-gains-assessment.use-case';
import type { IpcMainHandleRegistry } from '../../../../preload/main/registry/ipc-registrar';

describe('ReportIpcRegistrar', () => {
  it('registers both asset report and capital gains assessment channels', () => {
    const generateAssetsReportUseCase = {} as GenerateAssetsReportUseCase;
    const generateCapitalGainsAssessmentUseCase = {} as GenerateCapitalGainsAssessmentUseCase;
    const ipcMain = {
      handle: jest.fn(),
    } as unknown as IpcMainHandleRegistry;

    const registrar = new ReportIpcRegistrar(
      generateAssetsReportUseCase,
      generateCapitalGainsAssessmentUseCase,
    );

    const registeredChannels = registrar.register(ipcMain);

    expect(registeredChannels).toContain('report:assets-annual');
    expect(registeredChannels).toContain('tax-reporting:capital-gains-assessment');
    expect(ipcMain.handle).toHaveBeenCalledWith('report:assets-annual', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'tax-reporting:capital-gains-assessment',
      expect.any(Function),
    );
  });
});
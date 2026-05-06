import { asClass } from 'awilix';
import { GenerateAssetsReportUseCase } from '../../application/use-cases/generate-assets-report.use-case';
import { ReportIpcRegistrar } from '../../transport/registrars/report-ipc-registrar';
import type { MainContainer } from '../../../app/infra/container';

export function registerTaxReportingContext(container: MainContainer): void {
  container.register({
    generateAssetsReportUseCase: asClass(GenerateAssetsReportUseCase).singleton(),
    reportIpcRegistrar: asClass(ReportIpcRegistrar).singleton(),
  });
}

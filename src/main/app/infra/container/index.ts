import { asClass, asFunction, createContainer, InjectionMode } from 'awilix';
import type { Knex } from 'knex';
import { IpcRegistry } from '../../../../ipc/main/registry/ipc-registry';
import type { IpcRegistrar } from '../../../../ipc/main/registry/ipc-registrar';
import { registerIngestionContext } from '../../../ingestion/infra/container';
import { registerPortfolioContext } from '../../../portfolio/infra/container';
import { registerTaxReportingContext } from '../../../tax-reporting/infra/container';
import { AppIpcRegistrar } from '../../transport/registrars/app-ipc-registrar';
import { registerSharedInfrastructure } from './shared-infrastructure';
import type { AppCradle, MainBootstrap, MainContainer } from './types';

export type { AppCradle, MainBootstrap, MainContainer } from './types';

export function createMainBootstrap(database: Knex): MainBootstrap {
  const container = createContainer<AppCradle>({
    injectionMode: InjectionMode.CLASSIC,
  });

  registerSharedInfrastructure(container, database);
  registerAppContext(container);
  registerPortfolioContext(container);
  registerIngestionContext(container);
  registerTaxReportingContext(container);
  registerRootIpc(container);

  void container.cradle.recalculatePositionHandler;

  return {
    container,
    ipcRegistry: container.cradle.ipcRegistry,
  };
}

export function registerAppContext(container: MainContainer): void {
  container.register({
    appIpcRegistrar: asClass(AppIpcRegistrar).singleton(),
  });
}

function registerRootIpc(container: MainContainer): void {
  container.register({
    ipcRegistrars: asFunction(
      (
        appIpcRegistrar: IpcRegistrar,
        brokersIpcRegistrar: IpcRegistrar,
        assetsIpcRegistrar: IpcRegistrar,
        importIpcRegistrar: IpcRegistrar,
        portfolioIpcRegistrar: IpcRegistrar,
        reportIpcRegistrar: IpcRegistrar,
      ) => [
        appIpcRegistrar,
        brokersIpcRegistrar,
        assetsIpcRegistrar,
        importIpcRegistrar,
        portfolioIpcRegistrar,
        reportIpcRegistrar,
      ],
    ).singleton(),
    ipcRegistry: asClass(IpcRegistry).singleton(),
  });
}

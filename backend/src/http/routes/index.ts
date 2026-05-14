import type { Router } from 'express';
import { registerAssetRoutes } from './assets.route';
import { registerBrokerRoutes } from './brokers.route';
import { registerDailyBrokerTaxRoutes } from './daily-broker-taxes.route';
import { registerHealthRoute } from './health.route';
import { registerImportRoutes } from './imports.route';
import { registerInitialBalanceRoutes } from './initial-balances.route';
import { registerMonthlyTaxRoutes } from './monthly-tax.route';
import { registerPositionRoutes } from './positions.route';
import { registerReportRoutes } from './reports.route';
import type { ApiRouteContext } from './route-context';

export function registerApiRoutes(router: Router, context: ApiRouteContext): void {
  registerHealthRoute(router);
  registerImportRoutes(router, context);
  registerDailyBrokerTaxRoutes(router, context);
  registerInitialBalanceRoutes(router, context);
  registerPositionRoutes(router, context);
  registerMonthlyTaxRoutes(router, context);
  registerReportRoutes(router, context);
  registerAssetRoutes(router, context);
  registerBrokerRoutes(router, context);
}

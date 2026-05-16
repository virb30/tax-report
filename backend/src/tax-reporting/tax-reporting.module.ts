import type { IngestionModuleExports } from '../ingestion/ingestion.module';
import type { PortfolioModuleExports } from '../portfolio/portfolio.module';
import type { SharedInfrastructure } from '../shared/application/shared-infrastructure';
import type { Http } from '../shared/infra/http/http.interface';
import { GetMonthlyTaxDetailUseCase } from './application/use-cases/get-monthly-tax-detail.use-case';
import { GenerateAssetsReportUseCase } from './application/use-cases/generate-assets-report.use-case';
import { ListMonthlyTaxHistoryUseCase } from './application/use-cases/list-monthly-tax-history.use-case';
import { RecalculateMonthlyTaxHistoryUseCase } from './application/use-cases/recalculate-monthly-tax-history.use-case';
import { KnexMonthlyTaxCloseRepository } from './infra/repositories/knex-monthly-tax-close.repository';
import { MonthlyTaxController } from './transport/http/controllers/monthly-tax.controller';
import { ReportController } from './transport/http/controllers/report.controller';
import { RecalculateMonthlyTaxCloseHandler } from './transport/queue/handlers/recalculate-monthly-tax-close.handler';

interface TaxReportingModuleRepositories {
  monthlyTaxCloseRepository: KnexMonthlyTaxCloseRepository;
  dailyBrokerTaxRepository: TaxReportingIngestionDependencies['dailyBrokerTaxRepository'];
}

interface TaxReportingModuleUseCases {
  generateAssetsReportUseCase: GenerateAssetsReportUseCase;
  listMonthlyTaxHistoryUseCase: ListMonthlyTaxHistoryUseCase;
  getMonthlyTaxDetailUseCase: GetMonthlyTaxDetailUseCase;
  recalculateMonthlyTaxHistoryUseCase: RecalculateMonthlyTaxHistoryUseCase;
}

export type TaxReportingPortfolioDependencies = Pick<
  PortfolioModuleExports,
  'positionRepository' | 'brokerRepository' | 'assetRepository' | 'transactionRepository'
>;

export type TaxReportingIngestionDependencies = Pick<
  IngestionModuleExports,
  'dailyBrokerTaxRepository'
>;

export interface TaxReportingModuleExports {}

export interface TaxReportingModuleOverrides {
  repositories?: Partial<TaxReportingModuleRepositories>;
  useCases?: Partial<TaxReportingModuleUseCases>;
}

export interface TaxReportingModuleInput {
  shared: SharedInfrastructure;
  portfolio: TaxReportingPortfolioDependencies;
  ingestion: TaxReportingIngestionDependencies;
  http?: Http;
  overrides?: TaxReportingModuleOverrides;
}

export class TaxReportingModule {
  readonly exports: TaxReportingModuleExports;
  private readonly repositories: TaxReportingModuleRepositories;
  private readonly useCases: TaxReportingModuleUseCases;

  constructor(input: TaxReportingModuleInput) {
    this.repositories = {
      monthlyTaxCloseRepository:
        input.overrides?.repositories?.monthlyTaxCloseRepository ??
        new KnexMonthlyTaxCloseRepository(input.shared.database),
      dailyBrokerTaxRepository:
        input.overrides?.repositories?.dailyBrokerTaxRepository ??
        input.ingestion.dailyBrokerTaxRepository,
    };
    const recalculateMonthlyTaxHistoryUseCase =
      input.overrides?.useCases?.recalculateMonthlyTaxHistoryUseCase ??
      new RecalculateMonthlyTaxHistoryUseCase(
        this.repositories.monthlyTaxCloseRepository,
        input.portfolio.transactionRepository,
        input.portfolio.assetRepository,
        this.repositories.dailyBrokerTaxRepository,
      );

    this.useCases = {
      recalculateMonthlyTaxHistoryUseCase,
      listMonthlyTaxHistoryUseCase:
        input.overrides?.useCases?.listMonthlyTaxHistoryUseCase ??
        new ListMonthlyTaxHistoryUseCase(
          this.repositories.monthlyTaxCloseRepository,
          recalculateMonthlyTaxHistoryUseCase,
        ),
      getMonthlyTaxDetailUseCase:
        input.overrides?.useCases?.getMonthlyTaxDetailUseCase ??
        new GetMonthlyTaxDetailUseCase(this.repositories.monthlyTaxCloseRepository),
      generateAssetsReportUseCase:
        input.overrides?.useCases?.generateAssetsReportUseCase ??
        new GenerateAssetsReportUseCase(
          input.portfolio.positionRepository,
          input.portfolio.brokerRepository,
          input.portfolio.assetRepository,
          input.portfolio.transactionRepository,
        ),
    };
    this.exports = {};

    if (input.http) {
      void new MonthlyTaxController(input.http, {
        listMonthlyTaxHistoryUseCase: this.useCases.listMonthlyTaxHistoryUseCase,
        getMonthlyTaxDetailUseCase: this.useCases.getMonthlyTaxDetailUseCase,
        recalculateMonthlyTaxHistoryUseCase: this.useCases.recalculateMonthlyTaxHistoryUseCase,
      });
      void new ReportController(input.http, {
        generateAssetsReportUseCase: this.useCases.generateAssetsReportUseCase,
      });
    }

    void new RecalculateMonthlyTaxCloseHandler(
      input.shared.queue,
      this.useCases.recalculateMonthlyTaxHistoryUseCase,
    );
  }
}

import type { Knex } from 'knex';
import { AssetType, CapitalGainsAssetCategory } from '../../../../shared/types/domain';
import type {
  CapitalGainsAssessmentAssetFact,
  CapitalGainsAssessmentBrokerTaxFact,
  CapitalGainsAssessmentFacts,
  CapitalGainsAssessmentFeeFact,
  CapitalGainsAssessmentQuery,
  CapitalGainsAssessmentTransactionFact,
  FindCapitalGainsAssessmentFactsInput,
} from '../../application/queries/capital-gains-assessment.query';
import type { SourceType, TransactionType } from '../../../../shared/types/domain';

type TransactionRow = {
  id: string;
  date: string;
  ticker: string;
  asset_type: AssetType | null;
  type: TransactionType;
  quantity: string;
  unit_price: string;
  broker_id: string | null;
  source_type: SourceType;
  external_ref: string | null;
};

type FeeRow = {
  transaction_id: string;
  total_fees: string;
};

type AssetRow = {
  ticker: string;
  asset_type: AssetType | null;
  name: string | null;
  cnpj: string | null;
};

type DailyBrokerTaxRow = {
  date: string;
  broker_id: string | null;
  fees: string;
  irrf: string;
};

export class KnexCapitalGainsAssessmentQuery implements CapitalGainsAssessmentQuery {
  constructor(private readonly database: Knex) {}

  async findSourceFacts(
    input: FindCapitalGainsAssessmentFactsInput,
  ): Promise<CapitalGainsAssessmentFacts> {
    const bounds = this.yearBounds(input.baseYear);
    const transactionRows = await this.findTransactionRows(bounds[1]);
    const transactionIds = transactionRows.map((row) => row.id);
    const tickers = [...new Set(transactionRows.map((row) => row.ticker))].sort();
    const [feeRows, assetRows, brokerTaxRows] = await Promise.all([
      this.findFeeRows(transactionIds),
      this.findAssetRows(tickers),
      this.findBrokerTaxRows(bounds),
    ]);
    const assetsByTicker = new Map(assetRows.map((row) => [row.ticker, row]));

    return {
      baseYear: input.baseYear,
      transactions: transactionRows.map((row) => this.toTransactionFact(row)),
      fees: feeRows.map((row) => this.toFeeFact(row)),
      brokerTaxes: brokerTaxRows.map((row) => this.toBrokerTaxFact(row)),
      assets: tickers.map((ticker) => this.toAssetFact(ticker, assetsByTicker.get(ticker) ?? null)),
    };
  }

  private async findTransactionRows(endDate: string): Promise<TransactionRow[]> {
    return this.database<TransactionRow>('transactions')
      .leftJoin('ticker_data', 'ticker_data.ticker', 'transactions.ticker')
      .where('transactions.date', '<=', endDate)
      .orderBy('transactions.date', 'asc')
      .orderBy('transactions.id', 'asc')
      .select([
        'transactions.id',
        'transactions.date',
        'transactions.ticker',
        'ticker_data.asset_type',
        'transactions.type',
        'transactions.quantity',
        'transactions.unit_price',
        'transactions.broker_id',
        'transactions.source_type',
        'transactions.external_ref',
      ]);
  }

  private async findFeeRows(transactionIds: string[]): Promise<FeeRow[]> {
    if (transactionIds.length === 0) {
      return [];
    }

    return this.database<FeeRow>('transaction_fees')
      .whereIn('transaction_id', transactionIds)
      .orderBy('transaction_id', 'asc')
      .select('transaction_id', 'total_fees');
  }

  private async findAssetRows(tickers: string[]): Promise<AssetRow[]> {
    if (tickers.length === 0) {
      return [];
    }

    return this.database<AssetRow>('ticker_data')
      .whereIn('ticker', tickers)
      .orderBy('ticker', 'asc')
      .select('ticker', 'asset_type', 'name', 'cnpj');
  }

  private async findBrokerTaxRows(bounds: [string, string]): Promise<DailyBrokerTaxRow[]> {
    return this.database<DailyBrokerTaxRow>('daily_broker_taxes')
      .whereBetween('date', bounds)
      .orderBy('date', 'asc')
      .orderBy('broker_id', 'asc')
      .select('date', 'broker_id', 'fees', 'irrf');
  }

  private toTransactionFact(row: TransactionRow): CapitalGainsAssessmentTransactionFact {
    const quantity = this.toNumber(row.quantity);
    const unitPrice = this.toNumber(row.unit_price);

    return {
      id: row.id,
      date: row.date,
      ticker: row.ticker,
      assetType: row.asset_type,
      category: this.toCategory(row.asset_type),
      transactionType: row.type,
      quantity,
      unitPrice,
      grossValue: quantity * unitPrice,
      brokerId: row.broker_id,
      sourceType: row.source_type,
      externalRef: row.external_ref,
    };
  }

  private toFeeFact(row: FeeRow): CapitalGainsAssessmentFeeFact {
    return {
      id: row.transaction_id,
      transactionId: row.transaction_id,
      amount: this.toNumber(row.total_fees),
    };
  }

  private toBrokerTaxFact(row: DailyBrokerTaxRow): CapitalGainsAssessmentBrokerTaxFact {
    return {
      id: `${row.date}:${row.broker_id ?? ''}`,
      date: row.date,
      brokerId: row.broker_id,
      fees: this.toNumber(row.fees),
      irrf: this.toNumber(row.irrf),
    };
  }

  private toAssetFact(ticker: string, row: AssetRow | null): CapitalGainsAssessmentAssetFact {
    return {
      ticker,
      assetType: row?.asset_type ?? null,
      category: this.toCategory(row?.asset_type ?? null),
      name: row?.name ?? null,
      cnpj: row?.cnpj ?? null,
    };
  }

  private toCategory(assetType: AssetType | null): CapitalGainsAssetCategory | null {
    switch (assetType) {
      case AssetType.Stock:
        return CapitalGainsAssetCategory.Stock;
      case AssetType.Fii:
        return CapitalGainsAssetCategory.Fii;
      case AssetType.Etf:
        return CapitalGainsAssetCategory.Etf;
      default:
        return null;
    }
  }

  private toNumber(value: string): number {
    return Number.parseFloat(value);
  }

  private yearBounds(year: number): [string, string] {
    return [`${year}-01-01`, `${year}-12-31`];
  }
}

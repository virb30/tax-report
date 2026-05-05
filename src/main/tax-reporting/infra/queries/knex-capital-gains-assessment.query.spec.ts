import type { Knex } from 'knex';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import { AssetType, CapitalGainsAssetCategory } from '../../../../shared/types/domain';
import { SourceType, TransactionType } from '../../../../shared/types/domain';
import { KnexCapitalGainsAssessmentQuery } from './knex-capital-gains-assessment.query';

describe('KnexCapitalGainsAssessmentQuery', () => {
  let database: Knex;
  let query: KnexCapitalGainsAssessmentQuery;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    query = new KnexCapitalGainsAssessmentQuery(database);
    await insertBroker('broker-a');
    await insertBroker('broker-b');
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('returns empty transaction and broker tax collections for an empty selected year', async () => {
    const facts = await query.findSourceFacts({ baseYear: 2025 });

    expect(facts).toEqual({
      baseYear: 2025,
      transactions: [],
      fees: [],
      brokerTaxes: [],
      assets: [],
    });
  });

  it('preserves unsupported and missing asset metadata as source facts', async () => {
    await insertAsset({
      ticker: 'AAPL34',
      assetType: AssetType.Bdr,
      name: 'Apple BDR',
      cnpj: '00.000.000/0001-00',
    });
    await insertTransaction({
      id: 'tx-bdr',
      date: '2025-04-10',
      ticker: 'AAPL34',
    });
    await insertTransaction({
      id: 'tx-missing',
      date: '2025-04-11',
      ticker: 'UNKNOWN3',
    });

    const facts = await query.findSourceFacts({ baseYear: 2025 });

    expect(facts.transactions).toEqual([
      expect.objectContaining({
        id: 'tx-bdr',
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
        category: null,
      }),
      expect.objectContaining({
        id: 'tx-missing',
        ticker: 'UNKNOWN3',
        assetType: null,
        category: null,
      }),
    ]);
    expect(facts.assets).toEqual([
      {
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
        category: null,
        name: 'Apple BDR',
        cnpj: '00.000.000/0001-00',
      },
      {
        ticker: 'UNKNOWN3',
        assetType: null,
        category: null,
        name: null,
        cnpj: null,
      },
    ]);
  });

  it('loads transactions through selected year end with allocated fees and asset categories', async () => {
    await insertAsset({ ticker: 'PETR4', assetType: AssetType.Stock });
    await insertAsset({ ticker: 'HGLG11', assetType: AssetType.Fii });
    await insertAsset({ ticker: 'BOVA11', assetType: AssetType.Etf });
    await insertAsset({ ticker: 'AAPL34', assetType: AssetType.Bdr });

    await insertTransaction({ id: 'tx-before', date: '2024-12-31', ticker: 'PETR4' });
    await insertTransaction({ id: 'tx-stock', date: '2025-01-02', ticker: 'PETR4' });
    await insertTransaction({ id: 'tx-fii', date: '2025-02-03', ticker: 'HGLG11' });
    await insertTransaction({ id: 'tx-etf', date: '2025-03-04', ticker: 'BOVA11' });
    await insertTransaction({ id: 'tx-bdr', date: '2025-04-05', ticker: 'AAPL34' });
    await insertTransaction({ id: 'tx-missing', date: '2025-05-06', ticker: 'UNKNOWN3' });
    await insertTransaction({ id: 'tx-after', date: '2026-01-01', ticker: 'PETR4' });
    await insertTransactionFee({ transactionId: 'tx-stock', totalFees: '1.23' });
    await insertTransactionFee({ transactionId: 'tx-after', totalFees: '9.99' });

    const facts = await query.findSourceFacts({ baseYear: 2025 });

    expect(facts.transactions.map((transaction) => transaction.id)).toEqual([
      'tx-before',
      'tx-stock',
      'tx-fii',
      'tx-etf',
      'tx-bdr',
      'tx-missing',
    ]);
    expect(facts.transactions).toEqual([
      expect.objectContaining({
        id: 'tx-before',
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        category: CapitalGainsAssetCategory.Stock,
      }),
      expect.objectContaining({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        category: CapitalGainsAssetCategory.Stock,
        quantity: 10,
        unitPrice: 20.5,
        grossValue: 205,
      }),
      expect.objectContaining({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        category: CapitalGainsAssetCategory.Fii,
      }),
      expect.objectContaining({
        ticker: 'BOVA11',
        assetType: AssetType.Etf,
        category: CapitalGainsAssetCategory.Etf,
      }),
      expect.objectContaining({
        ticker: 'AAPL34',
        assetType: AssetType.Bdr,
        category: null,
      }),
      expect.objectContaining({
        ticker: 'UNKNOWN3',
        assetType: null,
        category: null,
      }),
    ]);
    expect(facts.fees).toEqual([
      {
        id: 'tx-stock',
        transactionId: 'tx-stock',
        amount: 1.23,
      },
    ]);
    expect(facts.assets.map((asset) => asset.ticker)).toEqual([
      'AAPL34',
      'BOVA11',
      'HGLG11',
      'PETR4',
      'UNKNOWN3',
    ]);
  });

  it('loads selected-year daily broker taxes without mutating stored data', async () => {
    await insertDailyBrokerTax({
      date: '2024-12-31',
      brokerId: 'broker-a',
      fees: '9',
      irrf: '1',
    });
    await insertDailyBrokerTax({
      date: '2025-03-10',
      brokerId: 'broker-b',
      fees: '1.23',
      irrf: '0.05',
    });
    await insertDailyBrokerTax({
      date: '2025-03-10',
      brokerId: 'broker-a',
      fees: '2.34',
      irrf: '0.06',
    });
    await insertDailyBrokerTax({
      date: '2026-01-01',
      brokerId: 'broker-a',
      fees: '8',
      irrf: '2',
    });

    const facts = await query.findSourceFacts({ baseYear: 2025 });
    const storedTaxes = await database('daily_broker_taxes')
      .orderBy('date', 'asc')
      .orderBy('broker_id', 'asc')
      .select('date', 'broker_id', 'fees', 'irrf');

    expect(facts.brokerTaxes).toEqual([
      {
        id: '2025-03-10:broker-a',
        date: '2025-03-10',
        brokerId: 'broker-a',
        fees: 2.34,
        irrf: 0.06,
      },
      {
        id: '2025-03-10:broker-b',
        date: '2025-03-10',
        brokerId: 'broker-b',
        fees: 1.23,
        irrf: 0.05,
      },
    ]);
    expect(storedTaxes).toHaveLength(4);
  });

  it('orders same-day transactions by stable date and id tie-breakers', async () => {
    await insertAsset({ ticker: 'PETR4', assetType: AssetType.Stock });
    await insertTransaction({ id: 'tx-3', date: '2025-06-02', ticker: 'PETR4' });
    await insertTransaction({ id: 'tx-2', date: '2025-06-01', ticker: 'PETR4' });
    await insertTransaction({ id: 'tx-1', date: '2025-06-01', ticker: 'PETR4' });

    const facts = await query.findSourceFacts({ baseYear: 2025 });

    expect(facts.transactions.map((transaction) => transaction.id)).toEqual([
      'tx-1',
      'tx-2',
      'tx-3',
    ]);
  });

  async function insertBroker(id: string): Promise<void> {
    const brokerSuffix = id === 'broker-a' ? '00' : '01';

    await database('brokers').insert({
      id,
      name: id,
      cnpj: `00.000.000/0001-${brokerSuffix}`,
      code: id,
      active: 1,
    });
  }

  async function insertTransaction(input: {
    id: string;
    date: string;
    ticker: string;
  }): Promise<void> {
    await database('transactions').insert({
      id: input.id,
      date: input.date,
      type: TransactionType.Buy,
      ticker: input.ticker,
      quantity: '10',
      unit_price: '20.5',
      broker_id: 'broker-a',
      source_type: SourceType.Manual,
      external_ref: input.id,
      import_batch_id: null,
    });
  }

  async function insertTransactionFee(input: {
    transactionId: string;
    totalFees: string;
  }): Promise<void> {
    await database('transaction_fees').insert({
      transaction_id: input.transactionId,
      total_fees: input.totalFees,
    });
  }

  async function insertAsset(input: {
    ticker: string;
    assetType: AssetType;
    name?: string;
    cnpj?: string;
  }): Promise<void> {
    await database('ticker_data').insert({
      ticker: input.ticker,
      asset_type: input.assetType,
      name: input.name ?? input.ticker,
      cnpj: input.cnpj ?? null,
      resolution_source: 'manual',
    });
  }

  async function insertDailyBrokerTax(input: {
    date: string;
    brokerId: string;
    fees: string;
    irrf: string;
  }): Promise<void> {
    await database('daily_broker_taxes').insert({
      date: input.date,
      broker_id: input.brokerId,
      fees: input.fees,
      irrf: input.irrf,
    });
  }
});

import {
  AssetType,
  AssetTypeSource,
  PendingIssueCode,
  ReportItemStatus,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { Asset } from '../../portfolio/domain/entities/asset.entity';
import { AssetPosition } from '../../portfolio/domain/entities/asset-position.entity';
import { Broker } from '../../portfolio/domain/entities/broker.entity';
import { Transaction } from '../../portfolio/domain/entities/transaction.entity';
import { Cnpj } from '../../shared/domain/value-objects/cnpj.vo';
import { Money } from '../../portfolio/domain/value-objects/money.vo';
import { Quantity } from '../../portfolio/domain/value-objects/quantity.vo';
import {
  buildDeclarationDescriptionText,
  ReportGenerator,
  formatBrl,
  getRevenueClassification,
} from './report-generator.service';

describe('ReportGenerator', () => {
  const broker = Broker.create({
    name: 'XP Investimentos',
    cnpj: new Cnpj('02.332.886/0001-04'),
    code: 'XPTO',
  });

  describe('formatBrl', () => {
    it('formats numbers in Brazilian currency style', () => {
      expect(formatBrl(1234.56)).toBe('1.234,56');
      expect(formatBrl(0)).toBe('0,00');
    });
  });

  describe('getRevenueClassification', () => {
    it('returns the expected mapping for supported asset types', () => {
      expect(getRevenueClassification(AssetType.Stock)).toEqual({ group: '03', code: '01' });
      expect(getRevenueClassification(AssetType.Bdr)).toEqual({ group: '04', code: '04' });
      expect(getRevenueClassification(AssetType.Fii)).toEqual({ group: '07', code: '03' });
      expect(getRevenueClassification(AssetType.Etf)).toEqual({ group: '07', code: '09' });
    });

    it('throws for unsupported asset types', () => {
      expect(() => getRevenueClassification('crypto' as AssetType)).toThrow(
        'Unsupported asset type for report: crypto',
      );
    });
  });

  describe('buildDeclarationDescriptionText', () => {
    it('builds a consolidated declaration text with all brokers', () => {
      const description = buildDeclarationDescriptionText({
        quantity: 100,
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        issuerCnpj: '33.000.167/0001-01',
        averagePrice: 35.2,
        currentYearValue: 3520,
        brokersSummary: [
          {
            brokerName: 'XP Investimentos',
            cnpj: '02.332.886/0001-04',
            quantity: 100,
          },
        ],
      });

      expect(description).toContain('100 cotas PETR4.');
      expect(description).toContain('Corretoras: XP Investimentos');
      expect(description).toContain('Custo total: R$ 3.520,00.');
    });
  });

  describe('generate', () => {
    it('marks report items as pending when catalog metadata is incomplete', () => {
      const generator = new ReportGenerator({
        brokers: [broker],
        assets: [Asset.create({ ticker: 'PETR4' })],
        transactionsByTicker: new Map(),
        baseYear: 2025,
      });

      const result = generator.generate([
        AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: Quantity.from(100),
          averagePrice: Money.from(20),
          brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(100) }],
          year: 2025,
        }),
      ]);

      expect(result[0]).toMatchObject({
        status: ReportItemStatus.Pending,
        canCopy: false,
        description: null,
      });
      expect(result[0]?.pendingIssues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining([
          PendingIssueCode.MissingAssetType,
          PendingIssueCode.MissingIssuerName,
          PendingIssueCode.MissingIssuerCnpj,
        ]),
      );
    });

    it('calculates previous-year value from transaction history and allows copying when ready', () => {
      const generator = new ReportGenerator({
        brokers: [broker],
        assets: [
          Asset.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            resolutionSource: AssetTypeSource.Manual,
            issuerCnpj: new Cnpj('33.000.167/0001-01'),
            name: 'Petrobras',
          }),
        ],
        transactionsByTicker: new Map([
          [
            'PETR4',
            [
              Transaction.create({
                date: '2024-06-01',
                type: TransactionType.Buy,
                ticker: 'PETR4',
                quantity: Quantity.from(10),
                unitPrice: Money.from(20),
                fees: Money.from(0),
                brokerId: broker.id,
                sourceType: SourceType.Csv,
              }),
              Transaction.create({
                date: '2025-03-01',
                type: TransactionType.Buy,
                ticker: 'PETR4',
                quantity: Quantity.from(10),
                unitPrice: Money.from(20),
                fees: Money.from(0),
                brokerId: broker.id,
                sourceType: SourceType.Csv,
              }),
            ],
          ],
        ]),
        baseYear: 2025,
      });

      const result = generator.generate([
        AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: Quantity.from(20),
          averagePrice: Money.from(20),
          brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(20) }],
          year: 2025,
        }),
      ]);

      expect(result[0]).toMatchObject({
        previousYearValue: 200,
        currentYearValue: 400,
        status: ReportItemStatus.Optional,
        canCopy: true,
      });
      expect(result[0]?.description).toContain('PETR4');
    });

    it('uses persisted previous-year position when available', () => {
      const generator = new ReportGenerator({
        brokers: [broker],
        assets: [
          Asset.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            resolutionSource: AssetTypeSource.Manual,
            issuerCnpj: new Cnpj('33.000.167/0001-01'),
            name: 'Petrobras',
          }),
        ],
        transactionsByTicker: new Map([
          [
            'PETR4',
            [
              Transaction.create({
                date: '2024-06-01',
                type: TransactionType.Buy,
                ticker: 'PETR4',
                quantity: Quantity.from(10),
                unitPrice: Money.from(20),
                fees: Money.from(5),
                brokerId: broker.id,
                sourceType: SourceType.Csv,
              }),
            ],
          ],
        ]),
        baseYear: 2025,
        previousYearPositions: [
          AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: Quantity.from(10),
            averagePrice: Money.from(19),
            brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(10) }],
            year: 2024,
          }),
        ],
      });

      const result = generator.generate([
        AssetPosition.create({
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: Quantity.from(20),
          averagePrice: Money.from(20),
          brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(20) }],
          year: 2025,
        }),
      ]);

      expect(result[0]).toMatchObject({
        previousYearValue: 190,
        currentYearValue: 400,
      });
    });

    it('uses the corrected catalog asset type when the persisted position type is stale', () => {
      const generator = new ReportGenerator({
        brokers: [broker],
        assets: [
          Asset.create({
            ticker: 'IVVB11',
            assetType: AssetType.Etf,
            resolutionSource: AssetTypeSource.Manual,
            issuerCnpj: new Cnpj('03.203.151/0001-35'),
            name: 'BlackRock',
          }),
        ],
        transactionsByTicker: new Map(),
        baseYear: 2025,
      });

      const result = generator.generate([
        AssetPosition.create({
          ticker: 'IVVB11',
          assetType: AssetType.Stock,
          totalQuantity: Quantity.from(10),
          averagePrice: Money.from(100),
          brokerBreakdown: [{ brokerId: broker.id, quantity: Quantity.from(10) }],
          year: 2025,
        }),
      ]);

      expect(result[0]).toMatchObject({
        ticker: 'IVVB11',
        assetType: AssetType.Etf,
        revenueClassification: { group: '07', code: '09' },
        canCopy: true,
      });
      expect(result[0]?.description).toContain('10 cotas IVVB11.');
    });

    it('skips zeroed positions', () => {
      const generator = new ReportGenerator({
        brokers: [broker],
        assets: [],
        transactionsByTicker: new Map(),
        baseYear: 2025,
      });

      expect(
        generator.generate([
          AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: Quantity.from(0),
            averagePrice: Money.from(20),
            brokerBreakdown: [],
            year: 2025,
          }),
        ]),
      ).toEqual([]);
    });
  });
});

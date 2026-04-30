import {
  AssetType,
  AssetTypeSource,
  PendingIssueCode,
  ReportItemStatus,
  SourceType,
  TransactionType,
} from '../../../shared/types/domain';
import { Asset } from '../portfolio/entities/asset.entity';
import { AssetPosition } from '../portfolio/entities/asset-position.entity';
import { Broker } from '../portfolio/entities/broker.entity';
import { Transaction } from '../portfolio/entities/transaction.entity';
import { Cnpj } from '../shared/cnpj.vo';
import { buildDeclarationDescriptionText, ReportGenerator, formatBrl, getRevenueClassification } from './report-generator.service';

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

      expect(description).toContain('100 acoes PETR4.');
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
          totalQuantity: 100,
          averagePrice: 20,
          brokerBreakdown: [{ brokerId: broker.id, quantity: 100 }],
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
                quantity: 10,
                unitPrice: 20,
                fees: 0,
                brokerId: broker.id,
                sourceType: SourceType.Csv,
              }),
              Transaction.create({
                date: '2025-03-01',
                type: TransactionType.Buy,
                ticker: 'PETR4',
                quantity: 10,
                unitPrice: 20,
                fees: 0,
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
          totalQuantity: 20,
          averagePrice: 20,
          brokerBreakdown: [{ brokerId: broker.id, quantity: 20 }],
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
            totalQuantity: 0,
            averagePrice: 20,
            brokerBreakdown: [],
            year: 2025,
          }),
        ]),
      ).toEqual([]);
    });
  });
});

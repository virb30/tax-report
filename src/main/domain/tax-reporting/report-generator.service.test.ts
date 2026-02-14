import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../shared/types/domain';
import {
  ReportGenerator,
  buildDiscriminationText,
  formatBrl,
  getRevenueClassification,
} from './report-generator.service';

describe('ReportGenerator', () => {
  describe('formatBrl', () => {
    it('formats number in Brazilian currency style', () => {
      expect(formatBrl(1234.56)).toBe('1.234,56');
      expect(formatBrl(0)).toBe('0,00');
      expect(formatBrl(35.2)).toBe('35,20');
    });
  });

  describe('getRevenueClassification', () => {
    it('returns 03/01 for stock and bdr', () => {
      expect(getRevenueClassification(AssetType.Stock)).toEqual({ group: '03', code: '01' });
      expect(getRevenueClassification(AssetType.Bdr)).toEqual({ group: '03', code: '01' });
    });
    it('returns 07/03 for fii', () => {
      expect(getRevenueClassification(AssetType.Fii)).toEqual({ group: '07', code: '03' });
    });
    it('returns 07/09 for etf', () => {
      expect(getRevenueClassification(AssetType.Etf)).toEqual({ group: '07', code: '09' });
    });
    it('throws for unsupported asset type', () => {
      expect(() => getRevenueClassification('crypto' as AssetType)).toThrow(
        'Unsupported asset type for report: crypto',
      );
    });
  });

  describe('buildDiscriminationText', () => {
    it('builds correct format for stock', () => {
      const text = buildDiscriminationText({
        quantity: 100,
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        cnpj: '02.332.886/0001-04',
        brokerName: 'XP Investimentos',
        averagePrice: 35.2,
        totalCost: 3520,
      });
      expect(text).toBe(
        '100 ações PETR4. CNPJ: 02.332.886/0001-04. Corretora: XP Investimentos. Custo médio: R$ 35,20. Custo total: R$ 3.520,00.',
      );
    });
    it('builds correct format for fii with cotas', () => {
      const text = buildDiscriminationText({
        quantity: 10,
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        cnpj: '02.332.886/0001-04',
        brokerName: 'XP Investimentos',
        averagePrice: 150,
        totalCost: 1500,
      });
      expect(text).toBe(
        '10 cotas HGLG11. CNPJ: 02.332.886/0001-04. Corretora: XP Investimentos. Custo médio: R$ 150,00. Custo total: R$ 1.500,00.',
      );
    });
  });

  describe('ReportGenerator.generate', () => {
    it('skips positions with zero quantity', () => {
      const generator = new ReportGenerator();
      const result = generator.generate([
        {
          position: {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 0,
            averagePrice: 20,
            brokerBreakdown: [],
          },
          brokersMap: new Map(),
        },
      ]);
      expect(result).toHaveLength(0);
    });

    it('generates one allocation per broker with correct discrimination', () => {
      const generator = new ReportGenerator();
      const brokersMap = new Map([
        [
          'broker-xp',
          { id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
        ],
      ]);
      const result = generator.generate([
        {
          position: {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 100,
            averagePrice: 35.2,
            brokerBreakdown: [{ brokerId: 'broker-xp', quantity: 100 }],
          },
          brokersMap,
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        totalQuantity: 100,
        averagePrice: 35.2,
        totalCost: 3520,
        revenueClassification: { group: '03', code: '01' },
        allocations: [
          {
            brokerId: 'broker-xp',
            brokerName: 'XP Investimentos',
            cnpj: '02.332.886/0001-04',
            quantity: 100,
            totalCost: 3520,
            description:
              '100 ações PETR4. CNPJ: 02.332.886/0001-04. Corretora: XP Investimentos. Custo médio: R$ 35,20. Custo total: R$ 3.520,00.',
          },
        ],
      });
    });

    it('generates multiple allocations for multi-broker position', () => {
      const generator = new ReportGenerator();
      const brokersMap = new Map([
        [
          'broker-xp',
          { id: 'broker-xp', name: 'XP Investimentos', cnpj: '02.332.886/0001-04' },
        ],
        [
          'broker-clear',
          { id: 'broker-clear', name: 'Clear Corretora', cnpj: '02.332.886/0011-78' },
        ],
      ]);
      const result = generator.generate([
        {
          position: {
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 150,
            averagePrice: 35.2,
            brokerBreakdown: [
              { brokerId: 'broker-xp', quantity: 100 },
              { brokerId: 'broker-clear', quantity: 50 },
            ],
          },
          brokersMap,
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.allocations).toHaveLength(2);
      expect(result[0]?.allocations[0]).toMatchObject({
        brokerId: 'broker-xp',
        quantity: 100,
        totalCost: 3520,
      });
      expect(result[0]?.allocations[1]).toMatchObject({
        brokerId: 'broker-clear',
        quantity: 50,
        totalCost: 1760,
      });
    });

    it('uses placeholder when broker not found', () => {
      const generator = new ReportGenerator();
      const result = generator.generate([
        {
          position: {
            ticker: 'VALE3',
            assetType: AssetType.Stock,
            totalQuantity: 50,
            averagePrice: 60,
            brokerBreakdown: [{ brokerId: 'unknown-broker', quantity: 50 }],
          },
          brokersMap: new Map(),
        },
      ]);

      expect(result[0]?.allocations[0]).toMatchObject({
        brokerName: 'Corretora não cadastrada',
        cnpj: 'N/A',
      });
    });
  });
});

import { describe, expect, it } from '@jest/globals';
import { AssetType } from '../../../../shared/types/domain';
import {
  ReportGenerator,
  buildDiscriminationText,
  formatBrl,
  getRevenueClassification,
} from './report-generator.service';
import { AssetPosition } from '@main/domain/portfolio/entities/asset-position.entity';
import { Broker } from '@main/domain/portfolio/entities/broker.entity';
import { Uuid } from '@main/domain/shared/uuid.vo';
import { Cnpj } from '@main/domain/shared/cnpj.vo';

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
    it('builds correct format for stock with issuer CNPJ', () => {
      const text = buildDiscriminationText({
        quantity: 100,
        ticker: 'PETR4',
        assetType: AssetType.Stock,
        issuerCnpj: '33.000.167/0001-01',
        brokerName: 'XP Investimentos',
        averagePrice: 35.2,
        totalCost: 3520,
      });
      expect(text).toBe(
        '100 ações PETR4. CNPJ: 33.000.167/0001-01. Corretora: XP Investimentos. Custo médio: R$ 35,20. Custo total: R$ 3.520,00.',
      );
    });
    it('builds correct format for fii with cotas and N/A when issuer not registered', () => {
      const text = buildDiscriminationText({
        quantity: 10,
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        issuerCnpj: 'N/A',
        brokerName: 'XP Investimentos',
        averagePrice: 150,
        totalCost: 1500,
      });
      expect(text).toBe(
        '10 cotas HGLG11. CNPJ: N/A. Corretora: XP Investimentos. Custo médio: R$ 150,00. Custo total: R$ 1.500,00.',
      );
    });
  });

  describe('ReportGenerator.generate', () => {
    it('skips positions with zero quantity', () => {
      const generator = new ReportGenerator();
      const result = generator.generate([
        {
          position: AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 0,
            averagePrice: 20,
            brokerBreakdown: [],
            year: 2025,
          }),
          brokersMap: new Map([
            [
              'broker-xp',
              Broker.create({ name: 'XP Investimentos', cnpj: new Cnpj('02.332.886/0001-04'), code: 'xp-broker' }),
            ],
          ]),
          issuerCnpj: 'N/A',
        },
      ]);
      expect(result).toHaveLength(0);
    });

    it('generates one allocation per broker with correct discrimination using issuer CNPJ', () => {
      const generator = new ReportGenerator();
      const broker = Broker.create({ name: 'XP Investimentos', cnpj: new Cnpj('02.332.886/0001-04'), code: 'xp-broker' });
      const result = generator.generate([
        {
          position: AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 100,
            averagePrice: 35.2,
            brokerBreakdown: [{ brokerId: broker.id, quantity: 100 }],
            year: 2025,
          }),
          brokersMap: new Map([
            [
              broker.id.value,
              broker,
            ],
          ]),
          issuerCnpj: '33.000.167/0001-01',
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
            brokerId: broker.id.value,
            brokerName: 'XP Investimentos',
            cnpj: broker.cnpj.value,
            quantity: 100,
            totalCost: 3520,
            description:
              '100 ações PETR4. CNPJ: 33.000.167/0001-01. Corretora: XP Investimentos. Custo médio: R$ 35,20. Custo total: R$ 3.520,00.',
          },
        ],
      });
    });

    it('generates multiple allocations for multi-broker position', () => {
      const generator = new ReportGenerator();
      const broker = Broker.create({ name: 'XP Investimentos', cnpj: new Cnpj('02.332.886/0001-04'), code: 'xp-broker' });
      const broker2 = Broker.create({ name: 'Clear Corretora', cnpj: new Cnpj('02.332.886/0011-78'), code: 'clear-broker' });
      const result = generator.generate([
        {
          position: AssetPosition.create({
            ticker: 'PETR4',
            assetType: AssetType.Stock,
            totalQuantity: 150,
            averagePrice: 35.2,
            brokerBreakdown: [
              { brokerId: broker.id, quantity: 100 },
              { brokerId: broker2.id, quantity: 50 },
            ],
            year: 2025,
          }),
          brokersMap: new Map([
            [broker.id.value, broker],
            [broker2.id.value, broker2],
          ]),
          issuerCnpj: '33.000.167/0001-01',
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.allocations).toHaveLength(2);
      expect(result[0]?.allocations[0]).toMatchObject({
        brokerId: broker.id.value,
        quantity: 100,
        totalCost: 3520,
        cnpj: broker.cnpj.value,
      });
      expect(result[0]?.allocations[1]).toMatchObject({
        brokerId: broker2.id.value,
        quantity: 50,
        totalCost: 1760,
        cnpj: broker2.cnpj.value,
      });
    });

    it('uses placeholder when broker not found and N/A for issuer when not registered', () => {
      const generator = new ReportGenerator();
      const result = generator.generate([
        {
          position: AssetPosition.create({
            ticker: 'VALE3',
            assetType: AssetType.Stock,
            totalQuantity: 50,
            averagePrice: 60,
            brokerBreakdown: [{ brokerId: Uuid.create(), quantity: 50 }],
            year: 2025,
          }),
          brokersMap: new Map([
            [
              Uuid.create().value,
              Broker.create({ name: 'Corretora não cadastrada', cnpj: new Cnpj('00.000.000/0001-00'), code: 'unknown-broker' }),
            ],
          ]),
          issuerCnpj: 'N/A',
        },
      ]);

      expect(result[0]?.allocations[0]).toMatchObject({
        brokerName: 'Corretora não cadastrada',
        cnpj: 'N/A',
      });
      expect(result[0]?.allocations[0]?.description).toContain('CNPJ: N/A.');
    });
  });
});

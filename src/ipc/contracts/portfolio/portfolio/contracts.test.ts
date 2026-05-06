import { AssetType } from '../../domain';
import {
  listPositionsContract,
  listPositionsSchema,
  recalculatePositionContract,
  recalculatePositionSchema,
  saveInitialBalanceDocumentContract,
  saveInitialBalanceDocumentSchema,
} from './contracts';

describe('portfolio contracts', () => {
  it('preserves primary portfolio channel names', () => {
    expect(saveInitialBalanceDocumentContract.channel).toBe(
      'portfolio:save-initial-balance-document',
    );
    expect(listPositionsContract.channel).toBe('portfolio:list-positions');
    expect(recalculatePositionContract.channel).toBe('portfolio:recalculate');
  });

  describe('saveInitialBalanceDocumentSchema', () => {
    it('accepts valid initial balance payloads', () => {
      expect(
        saveInitialBalanceDocumentSchema.parse({
          ticker: ' IVVB11 ',
          year: 2025,
          assetType: AssetType.Etf,
          name: ' iShares Core S&P 500 ',
          cnpj: ' 11.111.111/0001-11 ',
          averagePrice: '300',
          allocations: [{ brokerId: ' broker-xp ', quantity: '2' }],
        }),
      ).toEqual({
        ticker: 'IVVB11',
        year: 2025,
        assetType: AssetType.Etf,
        name: 'iShares Core S&P 500',
        cnpj: '11.111.111/0001-11',
        averagePrice: '300',
        allocations: [{ brokerId: 'broker-xp', quantity: '2' }],
      });
    });

    it('rejects invalid asset types and empty allocations', () => {
      expect(() =>
        saveInitialBalanceDocumentSchema.parse({
          ticker: 'IVVB11',
          year: 2025,
          assetType: 'crypto',
          averagePrice: '300',
          allocations: [],
        }),
      ).toThrow();
    });
  });

  describe('listPositionsSchema', () => {
    it('accepts base year payloads', () => {
      expect(listPositionsSchema.parse({ baseYear: 2025 })).toEqual({ baseYear: 2025 });
    });
  });

  describe('recalculatePositionSchema', () => {
    it('accepts legacy payloads without average price fee mode', () => {
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
      });
    });

    it('accepts the average price fee mode values', () => {
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
          averagePriceFeeMode: 'include',
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
        averagePriceFeeMode: 'include',
      });
      expect(
        recalculatePositionSchema.parse({
          ticker: 'PETR4',
          year: 2025,
          averagePriceFeeMode: 'ignore',
        }),
      ).toEqual({
        ticker: 'PETR4',
        year: 2025,
        averagePriceFeeMode: 'ignore',
      });
    });
  });
});

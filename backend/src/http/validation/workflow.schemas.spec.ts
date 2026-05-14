import { HttpValidationError } from '../errors/http-error';
import { parseHttpInput } from './http-validation';
import {
  assetUpdateBodySchema,
  brokerCreateBodySchema,
  brokerUpdateBodySchema,
  brokerUpdateParamsSchema,
  positionsQuerySchema,
  recalculatePositionBodySchema,
  saveInitialBalanceBodySchema,
} from './workflow.schemas';

describe('workflow HTTP schemas', () => {
  it('accepts valid broker payloads and rejects missing IDs', () => {
    expect(
      parseHttpInput(brokerCreateBodySchema, {
        name: 'XP',
        cnpj: '12345678000190',
        code: 'XP',
      }),
    ).toEqual({
      name: 'XP',
      cnpj: '12345678000190',
      code: 'XP',
    });
    expect(parseHttpInput(brokerUpdateBodySchema, { name: 'Clear' })).toEqual({
      name: 'Clear',
    });
    expect(() => parseHttpInput(brokerUpdateParamsSchema, {})).toThrow(HttpValidationError);
  });

  it('rejects asset update requests without editable fields', () => {
    expect(() => parseHttpInput(assetUpdateBodySchema, {})).toThrow(HttpValidationError);
  });

  it('rejects empty initial balance allocations and invalid year values', () => {
    expect(() =>
      parseHttpInput(saveInitialBalanceBodySchema, {
        ticker: 'ABCD3',
        year: 1999,
        assetType: 'stock',
        averagePrice: '10',
        allocations: [{ brokerId: 'broker-id', quantity: '1' }],
      }),
    ).toThrow(HttpValidationError);

    expect(() =>
      parseHttpInput(saveInitialBalanceBodySchema, {
        ticker: 'ABCD3',
        year: 2025,
        assetType: 'stock',
        averagePrice: '10',
        allocations: [],
      }),
    ).toThrow(HttpValidationError);
  });

  it('rejects invalid position year, ticker, and average-price fee mode values', () => {
    expect(() => parseHttpInput(positionsQuerySchema, { year: '1999' })).toThrow(
      HttpValidationError,
    );
    expect(() =>
      parseHttpInput(recalculatePositionBodySchema, {
        ticker: '',
        year: 2025,
        averagePriceFeeMode: 'include',
      }),
    ).toThrow(HttpValidationError);
    expect(() =>
      parseHttpInput(recalculatePositionBodySchema, {
        ticker: 'ABCD3',
        year: 2025,
        averagePriceFeeMode: 'bad',
      }),
    ).toThrow(HttpValidationError);
  });
});

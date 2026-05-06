import { OperationType } from '../../../shared/types/domain';
import { B3SpreadsheetTransactionMapper } from './b3-spreadsheet-transaction.mapper';

describe('B3SpreadsheetTransactionMapper', () => {
  let mapper: B3SpreadsheetTransactionMapper;

  beforeEach(() => {
    mapper = new B3SpreadsheetTransactionMapper();
  });

  describe('mapRowType', () => {
    it('returns Buy when movementType is "Transferência - Liquidação" and direction is "Crédito"', () => {
      const result = mapper.mapRowType('Crédito', 'Transferência - Liquidação');
      expect(result).toBe(OperationType.Buy);
    });

    it('returns Sell when movementType is "Transferência - Liquidação" and direction is "Débito"', () => {
      const result = mapper.mapRowType('Débito', 'Transferência - Liquidação');
      expect(result).toBe(OperationType.Sell);
    });

    it('returns TransferIn when movementType is "Transferência" and direction is "Crédito"', () => {
      const result = mapper.mapRowType('Crédito', 'Transferência');
      expect(result).toBe(OperationType.TransferIn);
    });

    it('returns TransferOut when movementType is "Transferência" and direction is "Débito"', () => {
      const result = mapper.mapRowType('Débito', 'Transferência');
      expect(result).toBe(OperationType.TransferOut);
    });

    it('returns null when movementType is "Transferência - Liquidação" but direction is invalid', () => {
      const result = mapper.mapRowType('Invalido', 'Transferência - Liquidação');
      expect(result).toBeNull();
    });

    it('returns null when movementType is "Transferência" but direction is invalid', () => {
      const result = mapper.mapRowType('Invalido', 'Transferência');
      expect(result).toBeNull();
    });

    it('returns Bonus when movementType is "Bonificação em ativos"', () => {
      const result = mapper.mapRowType('Crédito', 'Bonificação em ativos');
      expect(result).toBe(OperationType.Bonus);
    });

    it('returns null for explicitly discarded operations like "Direito de Subscrição"', () => {
      expect(mapper.mapRowType('', 'Direito de Subscrição')).toBeNull();
    });

    it('returns FractionAuction for "Leilão de Fração"', () => {
      expect(mapper.mapRowType('', 'Leilão de Fração')).toBe(OperationType.FractionAuction);
    });

    it('returns FractionAuction for plural "Leilão de Frações"', () => {
      expect(mapper.mapRowType('', 'Leilão de Frações')).toBe(OperationType.FractionAuction);
    });

    it('returns null for explicitly discarded operations like "Fração em ativos"', () => {
      expect(mapper.mapRowType('', 'Fração em ativos')).toBeNull();
    });

    it('returns null for unmapped unknown operations silently', () => {
      expect(mapper.mapRowType('Credito', 'Operacao Invalida 123')).toBeNull();
    });

    it('is case and accent insensitive during mapping', () => {
      expect(mapper.mapRowType('crédito', 'TRANSFERÊNCIA - LIQUIDAÇÃO')).toBe(OperationType.Buy);
      expect(mapper.mapRowType('DEBITO', 'transferência - liquidação')).toBe(OperationType.Sell);
    });

    it('handles null or undefined inputs gracefully as ignored operations', () => {
      expect(
        mapper.mapRowType(null as unknown as string, undefined as unknown as string),
      ).toBeNull();
    });
  });

  describe('validateRowIntegrity', () => {
    it('does not throw an error for a non-bonus operation', () => {
      expect(() => {
        mapper.validateRowIntegrity({}, OperationType.Buy);
      }).not.toThrow();
    });

    it('throws an error for a Bonus operation when unit price is missing', () => {
      expect(() => {
        mapper.validateRowIntegrity({ 'Outra Coluna': 123 }, OperationType.Bonus);
      }).toThrow('A operação de Bonificação necessita do valor na planilha.');
    });

    it('throws an error for a Bonus operation when price is negative', () => {
      expect(() => {
        mapper.validateRowIntegrity({ 'Preço Unitário': '-10,00' }, OperationType.Bonus);
      }).toThrow('A operação de Bonificação necessita do valor na planilha.');
    });

    it('throws an error for a Bonus operation when price is zero', () => {
      expect(() => {
        mapper.validateRowIntegrity({ 'Preço Unitário': '0' }, OperationType.Bonus);
      }).toThrow('A operação de Bonificação necessita do valor na planilha.');
    });

    it('does not throw an error for a Bonus operation if "Preço Unitário" is provided', () => {
      expect(() => {
        mapper.validateRowIntegrity({ 'Preço Unitário': '15.50' }, OperationType.Bonus);
      }).not.toThrow();
    });

    it('gracefully handles properties without accents like "Preco Unitario"', () => {
      expect(() => {
        mapper.validateRowIntegrity({ 'Preco Unitario': '15.50' }, OperationType.Bonus);
      }).not.toThrow();
    });
  });
});

import { OperationType } from '../../../shared/types/domain';

export interface SpreadsheetTransactionMapper {
  mapRowType(direction: string, movementType: string): OperationType | null;
  validateRowIntegrity(
    rowRawData: Record<string, unknown>,
    operationType: OperationType | null,
  ): void;
}

export class B3SpreadsheetTransactionMapper implements SpreadsheetTransactionMapper {
  private readonly movementMapping: Record<string, Record<string, OperationType> | OperationType> =
    {
      'transferencia - liquidacao': {
        credito: OperationType.Buy,
        debito: OperationType.Sell,
      },
      transferencia: {
        credito: OperationType.TransferIn,
        debito: OperationType.TransferOut,
      },
      'bonificacao em ativos': OperationType.Bonus,
      desdobramento: OperationType.Split,
      split: OperationType.Split,
      grupamento: OperationType.ReverseSplit,
      agrupamento: OperationType.ReverseSplit,
      'leilao de fracao': OperationType.FractionAuction,
      'leilao de fracoes': OperationType.FractionAuction,
    };

  mapRowType(direction: string, movementType: string): OperationType | null {
    const cleanedMovementType = this.cleanString(movementType);
    const cleanedDirection = this.cleanString(direction);

    const mapping = this.movementMapping[cleanedMovementType];

    if (!mapping) {
      return null;
    }

    if (typeof mapping === 'object') {
      return mapping[cleanedDirection] ?? null;
    }

    return mapping;
  }

  validateRowIntegrity(
    rowRawData: Record<string, unknown>,
    operationType: OperationType | null,
  ): void {
    if (operationType === OperationType.Bonus) {
      const unitPrice = this.normalizePrice(
        rowRawData['Preço Unitário'] ?? rowRawData['Preco Unitario'] ?? '',
      );

      const recognizedPrice = parseFloat(String(unitPrice).replace(',', '.'));

      if (isNaN(recognizedPrice) || recognizedPrice <= 0) {
        throw new Error('A operação de Bonificação necessita do valor na planilha.');
      }
    }
  }

  private normalizePrice(price: unknown): string {
    if (typeof price === 'string' || typeof price === 'number') {
      return String(price);
    }
    return '';
  }

  private cleanString(value: unknown): string {
    if (!value || typeof value !== 'string') return '';

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

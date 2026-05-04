import type { Uuid } from '../../../shared/domain/value-objects/uuid.vo';
import type { Money } from '../../../portfolio/domain/value-objects/money.vo';

type DailyBrokerTaxProps = {
  date: string;
  brokerId: Uuid;
  fees: Money;
  irrf: Money;
};

export class DailyBrokerTax {
  readonly date: string;
  readonly brokerId: Uuid;
  readonly fees: Money;
  readonly irrf: Money;

  private constructor(props: DailyBrokerTaxProps) {
    this.date = props.date;
    this.brokerId = props.brokerId;
    this.fees = props.fees;
    this.irrf = props.irrf;
    this.validate();
  }

  static create(props: DailyBrokerTaxProps): DailyBrokerTax {
    return new DailyBrokerTax(props);
  }

  static restore(props: DailyBrokerTaxProps): DailyBrokerTax {
    return new DailyBrokerTax(props);
  }

  private validate(): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      throw new Error('Daily broker tax date must use YYYY-MM-DD.');
    }

    if (this.fees.isNegative()) {
      throw new Error('Daily broker tax fees cannot be negative.');
    }

    if (this.irrf.isNegative()) {
      throw new Error('Daily broker tax IRRF cannot be negative.');
    }
  }
}

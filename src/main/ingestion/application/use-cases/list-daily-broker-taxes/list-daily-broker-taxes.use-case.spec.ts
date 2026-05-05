import { mock, mockReset } from 'jest-mock-extended';
import type { BrokerRepository } from '../../../../portfolio/application/repositories/broker.repository';
import { Broker } from '../../../../portfolio/domain/entities/broker.entity';
import { Money } from '../../../../portfolio/domain/value-objects/money.vo';
import { Cnpj } from '../../../../shared/domain/value-objects/cnpj.vo';
import { Uuid } from '../../../../shared/domain/value-objects/uuid.vo';
import { DailyBrokerTax } from '../../../domain/entities/daily-broker-tax.entity';
import type { DailyBrokerTaxRepository } from '../../repositories/daily-broker-tax.repository';
import { ListDailyBrokerTaxesUseCase } from './list-daily-broker-taxes.use-case';

describe('ListDailyBrokerTaxesUseCase', () => {
  const dailyBrokerTaxRepository = mock<DailyBrokerTaxRepository>();
  const brokerRepository = mock<BrokerRepository>();

  beforeEach(() => {
    mockReset(dailyBrokerTaxRepository);
    mockReset(brokerRepository);
  });

  it('lists daily broker taxes with broker metadata and fallback labels', async () => {
    const knownBroker = Broker.restore({
      id: Uuid.create(),
      name: 'XP Investimentos',
      cnpj: new Cnpj('02.332.886/0001-04'),
      code: 'XP',
      active: true,
    });
    const unknownBrokerId = Uuid.create();
    dailyBrokerTaxRepository.findAll.mockResolvedValue([
      DailyBrokerTax.create({
        date: '2025-04-01',
        brokerId: knownBroker.id,
        fees: Money.from(1.23),
        irrf: Money.from(0.01),
      }),
      DailyBrokerTax.create({
        date: '2025-04-02',
        brokerId: unknownBrokerId,
        fees: Money.from(2.34),
        irrf: Money.from(0.02),
      }),
    ]);
    brokerRepository.findAll.mockResolvedValue([knownBroker]);
    const useCase = new ListDailyBrokerTaxesUseCase(dailyBrokerTaxRepository, brokerRepository);

    const result = await useCase.execute();

    expect(result.items).toEqual([
      {
        date: '2025-04-01',
        brokerId: knownBroker.id.value,
        brokerCode: 'XP',
        brokerName: 'XP Investimentos',
        fees: 1.23,
        irrf: 0.01,
      },
      {
        date: '2025-04-02',
        brokerId: unknownBrokerId.value,
        brokerCode: unknownBrokerId.value,
        brokerName: unknownBrokerId.value,
        fees: 2.34,
        irrf: 0.02,
      },
    ]);
  });
});

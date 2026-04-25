
import { mock, mockReset } from 'jest-mock-extended';
import { ListBrokersUseCase } from './list-brokers.use-case';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import type { BrokerRepository } from '../../repositories/broker.repository';

describe('ListBrokersUseCase', () => {
  const brokerRepository = mock<BrokerRepository>();
  let useCase: ListBrokersUseCase;

  beforeEach(() => {
    mockReset(brokerRepository);
    brokerRepository.findByCode.mockResolvedValue(null);
    brokerRepository.findByCnpj.mockResolvedValue(null);
    brokerRepository.save.mockResolvedValue(undefined);
    useCase = new ListBrokersUseCase(brokerRepository);
  });

  it('should list all brokers', async () => {
    const broker1 = Broker.create({ name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP' });
    const broker2 = Broker.create({ name: 'Clear', cnpj: new Cnpj('02.332.886/0011-78'), code: 'CLEAR' });
    broker2.deactivate();
    brokerRepository.findAll.mockResolvedValue([
      broker1,
      broker2,
    ]);

    const result = await useCase.execute();

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ 
      id: broker1.id.value, 
      name: broker1.name, 
      cnpj: broker1.cnpj.value, 
      code: broker1.code, 
      active: broker1.isActive(),
    });
    expect(result.items[1]).toEqual({ 
      id: broker2.id.value, 
      name: broker2.name, 
      cnpj: broker2.cnpj.value, 
      code: broker2.code, 
      active: broker2.isActive(),
    });
  });

  it('should list only active brokers when activeOnly is true', async () => {
    const broker1 = Broker.create({ name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP' });
    const broker2 = Broker.create({ name: 'Clear', cnpj: new Cnpj('02.332.886/0011-78'), code: 'CLEAR' });
    broker2.deactivate();
    brokerRepository.findAllActive.mockResolvedValue([
      broker1,
    ]);

    const result = await useCase.execute({ activeOnly: true });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ 
      id: broker1.id.value, 
      name: broker1.name, 
      cnpj: broker1.cnpj.value, 
      code: broker1.code, 
      active: broker1.isActive(),
    });
  });
});

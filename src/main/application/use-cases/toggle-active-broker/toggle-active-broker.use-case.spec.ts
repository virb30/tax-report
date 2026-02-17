import { describe, expect, it } from '@jest/globals';
import { mock, mockReset } from 'jest-mock-extended';
import { Broker } from '../../../domain/portfolio/entities/broker.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import type { BrokerRepository } from '../../repositories/broker.repository';
import { ToggleActiveBrokerUseCase } from './toggle-active-broker.use-case';
import { Uuid } from '@main/domain/shared/uuid.vo';

describe('ToggleActiveBrokerUseCase', () => {
  const brokerRepository = mock<BrokerRepository>();
  let useCase: ToggleActiveBrokerUseCase;
  
  beforeEach(() => {
    mockReset(brokerRepository);
    brokerRepository.findById.mockResolvedValue(null);
    brokerRepository.update.mockResolvedValue(undefined);
    useCase = new ToggleActiveBrokerUseCase(brokerRepository);
  });

  it('should deactivate broker if it is active', async () => {
    const broker = Broker.create({ name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP' });
    brokerRepository.findById.mockResolvedValue(broker);
    const result = await useCase.execute({ id: broker.id.value });

    expect(result.id).toBe(broker.id.value);
    expect(result.name).toBe(broker.name);
    expect(result.cnpj).toBe(broker.cnpj.value);
    expect(result.code).toBe(broker.code);
    expect(result.active).toBe(false);
  });

  it('should activate broker', async () => {
    const broker = Broker.create({ name: 'XP', cnpj: new Cnpj('02.332.886/0001-04'), code: 'XP' });
    broker.deactivate();
    brokerRepository.findById.mockResolvedValue(broker);
    const result = await useCase.execute({ id: broker.id.value });

    expect(result.id).toBe(broker.id.value);
    expect(result.name).toBe(broker.name);
    expect(result.cnpj).toBe(broker.cnpj.value);
    expect(result.code).toBe(broker.code);
    expect(result.active).toBe(true);
  });

  it('should throw an error when broker not found', async () => {
    const id = Uuid.create();
    await expect(() => useCase.execute({ id: id.value })).rejects.toThrow(new Error('Corretora nao encontrada.'));
  });
});

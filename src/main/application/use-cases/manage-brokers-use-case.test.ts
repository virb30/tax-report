import { describe, expect, it, jest } from '@jest/globals';
import type { BrokerRepositoryPort } from '../repositories/broker.repository';
import { ManageBrokersUseCase } from './manage-brokers-use-case';

describe('ManageBrokersUseCase', () => {
  function createMockRepository(): jest.Mocked<BrokerRepositoryPort> {
    return {
      findById: jest.fn(),
      findByName: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    };
  }

  it('lists all brokers', async () => {
    const findAllMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', codigo: 'XP' },
      { id: 'b2', name: 'Clear', cnpj: '02.332.886/0011-78', codigo: 'CLEAR' },
    ]);
    const mockRepo = {
      ...createMockRepository(),
      findAll: findAllMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.list();

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', codigo: 'XP' });
    expect(result.items[1]).toEqual({ id: 'b2', name: 'Clear', cnpj: '02.332.886/0011-78', codigo: 'CLEAR' });
  });

  it('creates broker successfully', async () => {
    const findAllMock = jest.fn().mockResolvedValue([]);
    const findByCodeMock = jest.fn().mockResolvedValue(null);
    const saveMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findAll: findAllMock,
      findByCode: findByCodeMock,
      save: saveMock,
    };
    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.create({
      name: 'Nova Corretora',
      codigo: 'NOVA',
      cnpj: '12.345.678/0001-90',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.broker.name).toBe('Nova Corretora');
      expect(result.broker.cnpj).toBe('12.345.678/0001-90');
      expect(result.broker.codigo).toBe('NOVA');
      expect(result.broker.id).toMatch(/^broker-/);
    }
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('returns error when name is empty', async () => {
    const saveMock = jest.fn();
    const mockRepo = { ...createMockRepository(), save: saveMock };
    const useCase = new ManageBrokersUseCase(mockRepo);

    const result = await useCase.create({ name: '   ', codigo: 'XP', cnpj: '12.345.678/0001-90' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatorio');
    }
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns error when CNPJ is empty', async () => {
    const saveMock = jest.fn();
    const mockRepo = { ...createMockRepository(), save: saveMock };
    const useCase = new ManageBrokersUseCase(mockRepo);

    const result = await useCase.create({ name: 'Test', codigo: 'XP', cnpj: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatorio');
    }
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns error when CNPJ is duplicated', async () => {
    const findAllMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04' },
    ]);
    const saveMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findAll: findAllMock,
      save: saveMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.create({
      name: 'Outra Corretora',
      codigo: 'OUTRA',
      cnpj: '02.332.886/0001-04',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('CNPJ');
    }
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('detects duplicate CNPJ with different formatting', async () => {
    const findAllMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04' },
    ]);
    const mockRepo = { ...createMockRepository(), findAll: findAllMock };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.create({
      name: 'Outra',
      codigo: 'OUTRA',
      cnpj: '02332886000104',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('CNPJ');
    }
  });
});

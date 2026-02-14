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
      findAllActive: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
  }

  it('lists all brokers', async () => {
    const findAllMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true },
      { id: 'b2', name: 'Clear', cnpj: '02.332.886/0011-78', code: 'CLEAR', active: true },
    ]);
    const mockRepo = {
      ...createMockRepository(),
      findAll: findAllMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.list();

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true });
    expect(result.items[1]).toEqual({
      id: 'b2',
      name: 'Clear',
      cnpj: '02.332.886/0011-78',
      code: 'CLEAR',
      active: true,
    });
  });

  it('lists only active brokers when activeOnly is true', async () => {
    const findAllActiveMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true },
    ]);
    const mockRepo = {
      ...createMockRepository(),
      findAllActive: findAllActiveMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.list({ activeOnly: true });

    expect(findAllActiveMock).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true });
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
      code: 'NOVA',
      cnpj: '12.345.678/0001-90',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.broker.name).toBe('Nova Corretora');
      expect(result.broker.cnpj).toBe('12.345.678/0001-90');
      expect(result.broker.code).toBe('NOVA');
      expect(result.broker.active).toBe(true);
      expect(result.broker.id).toMatch(/^broker-/);
    }
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('returns error when name is empty', async () => {
    const saveMock = jest.fn();
    const mockRepo = { ...createMockRepository(), save: saveMock };
    const useCase = new ManageBrokersUseCase(mockRepo);

    const result = await useCase.create({ name: '   ', code: 'XP', cnpj: '12.345.678/0001-90' });

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

    const result = await useCase.create({ name: 'Test', code: 'XP', cnpj: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('obrigatorio');
    }
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns error when CNPJ is duplicated', async () => {
    const findAllMock = jest.fn().mockResolvedValue([
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true },
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
      code: 'OUTRA',
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
      { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true },
    ]);
    const mockRepo = { ...createMockRepository(), findAll: findAllMock };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.create({
      name: 'Outra',
      code: 'OUTRA',
      cnpj: '02332886000104',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('CNPJ');
    }
  });

  it('updates broker successfully', async () => {
    const existing = { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true };
    const findByIdMock = jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce({
      ...existing,
      name: 'XP Investimentos',
    });
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      findAll: jest.fn().mockResolvedValue([existing]),
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.update({
      id: 'b1',
      name: 'XP Investimentos',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.broker.name).toBe('XP Investimentos');
    }
    expect(updateMock).toHaveBeenCalledWith('b1', { name: 'XP Investimentos' });
  });

  it('update returns error when name is empty', async () => {
    const existing = { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true };
    const findByIdMock = jest.fn().mockResolvedValue(existing);
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.update({ id: 'b1', name: '   ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('vazio');
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('update returns error when CNPJ is duplicated by another broker', async () => {
    const existing = { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true };
    const other = { id: 'b2', name: 'Clear', cnpj: '02.332.886/0011-78', code: 'CLEAR', active: true };
    const findByIdMock = jest.fn().mockResolvedValue(existing);
    const findAllMock = jest.fn().mockResolvedValue([existing, other]);
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      findAll: findAllMock,
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.update({
      id: 'b1',
      cnpj: '02.332.886/0011-78',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('CNPJ');
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('update does not fail when CNPJ is same as own broker', async () => {
    const existing = { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true };
    const findByIdMock = jest.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing);
    const findAllMock = jest.fn().mockResolvedValue([existing]);
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      findAll: findAllMock,
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.update({
      id: 'b1',
      name: 'XP Investimentos',
    });

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith('b1', { name: 'XP Investimentos' });
  });

  it('toggleActive toggles broker status', async () => {
    const existing = { id: 'b1', name: 'XP', cnpj: '02.332.886/0001-04', code: 'XP', active: true };
    const findByIdMock = jest
      .fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ ...existing, active: false });
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.toggleActive({ id: 'b1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.broker.active).toBe(false);
    }
    expect(updateMock).toHaveBeenCalledWith('b1', { active: false });
  });

  it('toggleActive returns error when broker not found', async () => {
    const findByIdMock = jest.fn().mockResolvedValue(null);
    const updateMock = jest.fn();
    const mockRepo = {
      ...createMockRepository(),
      findById: findByIdMock,
      update: updateMock,
    };

    const useCase = new ManageBrokersUseCase(mockRepo);
    const result = await useCase.toggleActive({ id: 'nonexistent' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('encontrada');
    }
    expect(updateMock).not.toHaveBeenCalled();
  });
});

import { mock, mockReset } from 'jest-mock-extended';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import type { AssetRepository } from '../../repositories/asset.repository';
import { UpdateAssetUseCase } from './update-asset.use-case';

describe('UpdateAssetUseCase', () => {
  const assetRepository = mock<AssetRepository>();
  let useCase: UpdateAssetUseCase;

  beforeEach(() => {
    mockReset(assetRepository);
    assetRepository.findByTicker.mockResolvedValue(null);
    assetRepository.findByTickersList.mockResolvedValue([]);
    assetRepository.findAll.mockResolvedValue([]);
    assetRepository.save.mockResolvedValue(undefined);
    useCase = new UpdateAssetUseCase(assetRepository);
  });

  it('updates only supplied fields and preserves omitted values', async () => {
    const existing = Asset.create({
      ticker: 'PETR4',
      issuerCnpj: new Cnpj('33.000.167/0001-01'),
      name: 'Petrobras',
      assetType: AssetType.Stock,
      resolutionSource: AssetTypeSource.File,
    });
    assetRepository.findByTicker.mockResolvedValue(existing);

    const result = await useCase.execute({
      ticker: 'PETR4',
      name: 'Petrobras S.A.',
    });

    expect(result).toEqual({
      ticker: 'PETR4',
      assetType: AssetType.Stock,
      resolutionSource: AssetTypeSource.File,
      name: 'Petrobras S.A.',
      cnpj: '33.000.167/0001-01',
      isReportReadyMetadata: true,
    });
    expect(assetRepository.save).toHaveBeenCalledWith(existing);
  });

  it('marks manual provenance when canonical asset type is updated', async () => {
    const existing = Asset.create({
      ticker: 'IVVB11',
      issuerCnpj: new Cnpj('24.000.000/0001-00'),
      name: 'iShares',
      assetType: AssetType.Stock,
      resolutionSource: AssetTypeSource.File,
    });
    assetRepository.findByTicker.mockResolvedValue(existing);

    const result = await useCase.execute({
      ticker: 'IVVB11',
      assetType: AssetType.Etf,
    });

    expect(result.assetType).toBe(AssetType.Etf);
    expect(result.resolutionSource).toBe(AssetTypeSource.Manual);
  });

  it('throws when ticker is not found', async () => {
    await expect(useCase.execute({ ticker: 'UNKNOWN', name: 'Missing' })).rejects.toThrow(
      new Error('Ativo nao encontrado.'),
    );
  });

  it('throws when no mutable fields are informed', async () => {
    const existing = Asset.create({ ticker: 'PETR4' });
    assetRepository.findByTicker.mockResolvedValue(existing);

    await expect(useCase.execute({ ticker: 'PETR4' })).rejects.toThrow(
      new Error('Nenhum campo para atualizar foi informado.'),
    );
  });
});

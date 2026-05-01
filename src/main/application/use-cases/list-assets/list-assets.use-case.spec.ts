import { mock, mockReset } from 'jest-mock-extended';
import { AssetType, AssetTypeSource } from '../../../../shared/types/domain';
import { Asset } from '../../../domain/portfolio/entities/asset.entity';
import { Cnpj } from '../../../domain/shared/cnpj.vo';
import type { AssetRepository } from '../../repositories/asset.repository';
import { ListAssetsUseCase } from './list-assets.use-case';

describe('ListAssetsUseCase', () => {
  const assetRepository = mock<AssetRepository>();
  let useCase: ListAssetsUseCase;

  beforeEach(() => {
    mockReset(assetRepository);
    assetRepository.findByTicker.mockResolvedValue(null);
    assetRepository.findByTickersList.mockResolvedValue([]);
    assetRepository.findAll.mockResolvedValue([]);
    assetRepository.save.mockResolvedValue(undefined);
    useCase = new ListAssetsUseCase(assetRepository);
  });

  it('lists canonical asset catalog rows with nullable issuer metadata', async () => {
    assetRepository.findAll.mockResolvedValue([
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
      }),
      Asset.create({
        ticker: 'VALE3',
        issuerCnpj: new Cnpj('33.592.510/0001-54'),
        name: 'Vale',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
      }),
    ]);

    const result = await useCase.execute();

    expect(result.items).toEqual([
      {
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
        name: null,
        cnpj: null,
        isReportReadyMetadata: false,
      },
      {
        ticker: 'VALE3',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
        name: 'Vale',
        cnpj: '33.592.510/0001-54',
        isReportReadyMetadata: true,
      },
    ]);
  });

  it('filters pending assets when pendingOnly is true', async () => {
    assetRepository.findAll.mockResolvedValue([
      Asset.create({
        ticker: 'ABEV3',
        issuerCnpj: new Cnpj('07.526.557/0001-00'),
        name: 'Ambev',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
      }),
      Asset.create({
        ticker: 'IVVB11',
        issuerCnpj: new Cnpj('24.000.000/0001-00'),
        name: 'iShares',
      }),
    ]);

    const result = await useCase.execute({ pendingOnly: true });

    expect(result.items.map((asset) => asset.ticker)).toEqual(['HGLG11', 'IVVB11']);
  });

  it('filters only report-blocking metadata gaps when reportBlockingOnly is true', async () => {
    assetRepository.findAll.mockResolvedValue([
      Asset.create({
        ticker: 'ABEV3',
        issuerCnpj: new Cnpj('07.526.557/0001-00'),
        name: 'Ambev',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
      Asset.create({
        ticker: 'HGLG11',
        assetType: AssetType.Fii,
        resolutionSource: AssetTypeSource.File,
      }),
      Asset.create({
        ticker: 'IVVB11',
        issuerCnpj: new Cnpj('24.000.000/0001-00'),
        name: 'iShares',
      }),
    ]);

    const result = await useCase.execute({ reportBlockingOnly: true });

    expect(result.items.map((asset) => asset.ticker)).toEqual(['HGLG11']);
  });
});

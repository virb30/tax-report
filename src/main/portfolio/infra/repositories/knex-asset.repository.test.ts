import type { Knex } from 'knex';
import { AssetType, AssetTypeSource } from '../../../shared/types/domain';
import { createDatabaseConnection, initializeDatabase } from '../../../app/infra/database/database';
import { Asset } from '../../domain/entities/asset.entity';
import { Cnpj } from '../../../shared/domain/value-objects/cnpj.vo';
import { KnexAssetRepository } from './knex-asset.repository';

describe('KnexAssetRepository', () => {
  let database: Knex;
  let repository: KnexAssetRepository;

  beforeEach(async () => {
    database = createDatabaseConnection(':memory:');
    await initializeDatabase(database, false);
    repository = new KnexAssetRepository(database);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('maps a row with null issuer metadata into a valid catalog asset', async () => {
    await database('ticker_data').insert({
      ticker: 'HGLG11',
      cnpj: null,
      name: null,
      asset_type: AssetType.Fii,
      resolution_source: AssetTypeSource.File,
    });

    const found = await repository.findByTicker('HGLG11');

    expect(found).not.toBeNull();
    expect(found?.ticker).toBe('HGLG11');
    expect(found?.issuerCnpj).toBeNull();
    expect(found?.name).toBeNull();
    expect(found?.assetType).toBe(AssetType.Fii);
    expect(found?.resolutionSource).toBe(AssetTypeSource.File);
  });

  it('returns null when ticker is not found', async () => {
    const found = await repository.findByTicker('UNKNOWN');

    expect(found).toBeNull();
  });

  it('returns empty array when ticker list is empty or missing', async () => {
    await repository.save(
      Asset.create({
        ticker: 'PETR4',
        issuerCnpj: new Cnpj('33.000.167/0001-01'),
        name: 'Petrobras',
      }),
    );

    await expect(repository.findByTickersList([])).resolves.toEqual([]);
    await expect(repository.findByTickersList(['UNKNOWN'])).resolves.toEqual([]);
  });

  it('upserts the same ticker without duplicating rows and updates catalog fields', async () => {
    await repository.save(
      Asset.create({
        ticker: 'VALE3',
        issuerCnpj: new Cnpj('33.592.510/0001-54'),
        name: 'Vale',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await repository.save(
      Asset.create({
        ticker: 'VALE3',
        issuerCnpj: new Cnpj('33.592.510/0001-54'),
        name: 'Vale S.A.',
        assetType: AssetType.Bdr,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );

    const found = await repository.findByTickersList(['VALE3']);
    const rows = await database('ticker_data').where({ ticker: 'VALE3' });

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      ticker: 'VALE3',
      issuerCnpj: '33.592.510/0001-54',
      name: 'Vale S.A.',
      assetType: AssetType.Bdr,
      resolutionSource: AssetTypeSource.Manual,
    });
    expect(rows).toHaveLength(1);
  });

  it('findAll returns catalog rows ordered by ticker after the schema change', async () => {
    await repository.save(
      Asset.create({
        ticker: 'PETR4',
        issuerCnpj: new Cnpj('33.000.167/0001-01'),
        name: 'Petrobras',
      }),
    );
    await repository.save(
      Asset.create({
        ticker: 'VALE3',
        issuerCnpj: new Cnpj('33.592.510/0001-54'),
        name: 'Vale',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.File,
      }),
    );
    await repository.save(
      Asset.create({
        ticker: 'ABEV3',
        issuerCnpj: new Cnpj('07.526.557/0001-00'),
        name: 'Ambev',
        assetType: AssetType.Stock,
        resolutionSource: AssetTypeSource.Manual,
      }),
    );

    const all = await repository.findAll();

    expect(all).toHaveLength(3);
    expect(all.map((asset) => asset.ticker)).toEqual(['ABEV3', 'PETR4', 'VALE3']);
  });
});

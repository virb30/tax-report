import type { JSX } from 'react';
import { useAssetCatalog } from './assets-page/use-asset-catalog';
import { AssetTable } from './assets-page/AssetTable';
import { EditAssetModal } from '../components/assets/EditAssetModal';

export function AssetsPage(): JSX.Element {
  const catalog = useAssetCatalog();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Catalogo de Ativos</h2>
          <p className="mt-2 text-sm text-slate-600">
            Gerencie os dados dos emissores e a classificacao dos ativos para o relatorio anual.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => void catalog.refresh()}
          disabled={catalog.isLoading}
        >
          {catalog.isLoading ? 'Atualizando...' : 'Atualizar Lista'}
        </button>
      </div>

      {catalog.feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {catalog.feedbackMessage}
        </p>
      ) : null}
      {catalog.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {catalog.errorMessage}
        </p>
      ) : null}

      <AssetTable
        assets={catalog.assets}
        isLoading={catalog.isLoading}
        onEdit={catalog.openEditModal}
      />

      <EditAssetModal
        asset={catalog.editingAsset}
        isOpen={catalog.editingAsset !== null}
        onClose={catalog.closeEditModal}
        onSave={catalog.saveAsset}
        isSaving={catalog.isSaving}
      />
    </section>
  );
}

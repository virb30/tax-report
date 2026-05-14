import type { JSX } from 'react';
import type { AssetCatalogItem } from '@/types/api.types';
import { AssetType } from '@/types/api.types';

interface AssetTableProps {
  assets: AssetCatalogItem[];
  isLoading: boolean;
  onEdit: (asset: AssetCatalogItem) => void;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'Acoes',
  [AssetType.Fii]: 'FIIs',
  [AssetType.Etf]: 'ETFs',
  [AssetType.Bdr]: 'BDRs',
};

export function AssetTable({ assets, isLoading, onEdit }: AssetTableProps): JSX.Element {
  if (isLoading) {
    return <p className="mt-8 text-center text-slate-500 text-sm">Carregando ativos...</p>;
  }

  if (assets.length === 0) {
    return (
      <p className="mt-8 text-center text-slate-500 text-sm">
        Nenhum ativo encontrado no catalogo.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Nome do Emissor</th>
            <th className="px-3 py-2">CNPJ</th>
            <th className="px-3 py-2">Status Report</th>
            <th className="px-3 py-2 text-right">Acoes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assets.map((asset) => (
            <tr key={asset.ticker} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium">{asset.ticker}</td>
              <td className="px-3 py-2">
                {asset.assetType ? (
                  ASSET_TYPE_LABELS[asset.assetType]
                ) : (
                  <span className="text-amber-600 font-medium">Pendente</span>
                )}
              </td>
              <td className="px-3 py-2 text-slate-600">{asset.name || '---'}</td>
              <td className="px-3 py-2 text-slate-600">{asset.cnpj || '---'}</td>
              <td className="px-3 py-2">
                {asset.isReportReadyMetadata ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Pronto
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Incompleto
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className="text-slate-900 hover:text-slate-600 font-medium"
                  onClick={() => onEdit(asset)}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

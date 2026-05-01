import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { AssetType } from '../../../shared/types/domain';
import type { AssetCatalogItem } from '../../../preload/contracts/portfolio/assets.contract';

interface EditAssetModalProps {
  asset: AssetCatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    ticker: string,
    data: { name?: string; cnpj?: string; assetType?: AssetType },
  ) => Promise<void>;
  isSaving: boolean;
}

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: AssetType.Stock, label: 'Acoes' },
  { value: AssetType.Fii, label: 'FIIs' },
  { value: AssetType.Etf, label: 'ETFs' },
  { value: AssetType.Bdr, label: 'BDRs' },
];

export function EditAssetModal({
  asset,
  isOpen,
  onClose,
  onSave,
  isSaving,
}: EditAssetModalProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [assetType, setAssetType] = useState<AssetType | ''>('');

  useEffect(() => {
    if (asset) {
      setName(asset.name ?? '');
      setCnpj(asset.cnpj ?? '');
      setAssetType(asset.assetType ?? '');
    }
  }, [asset, isOpen]);

  if (!isOpen || !asset) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(asset.ticker, {
      name: name || undefined,
      cnpj: cnpj || undefined,
      assetType: (assetType as AssetType) || undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    void handleSave(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800">Editar Ativo: {asset.ticker}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Atualize os dados do emissor ou corrija a classificacao do ativo.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nome do Emissor
            <input
              type="text"
              className="rounded-md border border-slate-300 px-3 py-2 font-normal focus:border-slate-500 focus:outline-none"
              placeholder="Ex: Petrobras S.A."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            CNPJ do Emissor
            <input
              type="text"
              className="rounded-md border border-slate-300 px-3 py-2 font-normal focus:border-slate-500 focus:outline-none"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Tipo de Ativo
            <select
              className="rounded-md border border-slate-300 px-3 py-2 font-normal focus:border-slate-500 focus:outline-none"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
            >
              <option value="" disabled>
                Selecione o tipo
              </option>
              {ASSET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {asset.assetType && assetType !== asset.assetType && (
              <p className="mt-1 text-xs text-amber-600">
                Atencao: Mudar o tipo disparara o reprocessamento de todo o historico deste ticker.
              </p>
            )}
          </label>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import { ReportItemStatus, type AssetType } from '../../ipc/public';
import type { GenerateAssetsReportResult } from '../../ipc/public';
import type { AssetCatalogItem } from '../../ipc/public';
import { buildErrorMessage } from '../errors/build-error-message';
import { buildYearOptions, getDefaultBaseYear } from '../../shared/utils/year';
import { ReportItemCard } from './report-page/ReportItemCard';
import { EditAssetModal } from '../components/assets/EditAssetModal';

export function ReportPage(): JSX.Element {
  const defaultBaseYear = getDefaultBaseYear();
  const yearOptions = buildYearOptions(defaultBaseYear, {
    yearsBefore: 9,
    yearsAfter: 0,
    descending: true,
  });
  const [baseYear, setBaseYear] = useState(String(defaultBaseYear));
  const [report, setReport] = useState<GenerateAssetsReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');

  const [editingAsset, setEditingAsset] = useState<AssetCatalogItem | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setCopiedMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.generateAssetsReport({
        baseYear: Number(baseYear),
      });
      setReport(result);
    } catch (error: unknown) {
      setReport(null);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [baseYear]);

  async function handleCopy(label: string, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(`${label} copiado com sucesso.`);
      setTimeout(() => setCopiedMessage(''), 3000);
    } catch {
      setCopiedMessage('Nao foi possivel copiar automaticamente. Selecione e copie manualmente.');
    }
  }

  const handleRepair = async (ticker: string) => {
    try {
      const result = await window.electronApi.listAssets({ pendingOnly: false });
      const asset = result.items.find((a) => a.ticker === ticker);
      if (asset) {
        setEditingAsset(asset);
      } else {
        setErrorMessage(`Ativo ${ticker} nao encontrado no catalogo.`);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  };

  const saveRepair = async (
    ticker: string,
    data: { name?: string; cnpj?: string; assetType?: AssetType },
  ) => {
    setIsRepairing(true);
    setErrorMessage('');
    try {
      if (data.assetType && data.assetType !== editingAsset?.assetType) {
        await window.electronApi.repairAssetType({ ticker, assetType: data.assetType });
      }

      const updateResult = await window.electronApi.updateAsset({ ticker, ...data });
      if (updateResult.success) {
        setFeedbackMessage(`Ativo ${ticker} corrigido com sucesso. Atualizando relatorio...`);
        setEditingAsset(null);
        await handleGenerateReport();
      } else {
        setErrorMessage(updateResult.error);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsRepairing(false);
    }
  };

  const groupedItems = useMemo(() => {
    if (!report) return { ready: [], pending: [], unsupported: [] };

    return {
      ready: report.items.filter(
        (item) => item.canCopy && item.status !== ReportItemStatus.Pending,
      ),
      pending: report.items.filter((item) => item.status === ReportItemStatus.Pending),
      unsupported: report.items.filter(
        (item) =>
          item.status === ReportItemStatus.Unsupported ||
          (!item.canCopy && item.status !== ReportItemStatus.Pending),
      ),
    };
  }, [report]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Relatorio anual de bens e direitos</h2>
      <p className="mt-2 text-sm text-slate-600">
        Gere a posicao de 31/12 e resolva pendencias para atingir o estado de pronto para
        declaracao.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano-base
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={baseYear}
            onChange={(event) => setBaseYear(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handleGenerateReport();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Gerando...' : 'Gerar Relatorio'}
        </button>
      </div>

      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
      {feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedbackMessage}
        </p>
      ) : null}
      {copiedMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {copiedMessage}
        </p>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-slate-700">Data de referencia: {report.referenceDate}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-md bg-emerald-50 p-4 border border-emerald-100">
              <p className="text-sm text-emerald-700 font-medium">Prontos</p>
              <p className="text-2xl font-bold text-emerald-900">{groupedItems.ready.length}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-4 border border-amber-100">
              <p className="text-sm text-amber-700 font-medium">Pendencias</p>
              <p className="text-2xl font-bold text-amber-900">{groupedItems.pending.length}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-4 border border-slate-100">
              <p className="text-sm text-slate-700 font-medium">Outros / Fora de Escopo</p>
              <p className="text-2xl font-bold text-slate-900">{groupedItems.unsupported.length}</p>
            </div>
          </div>

          {report.items.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Nenhuma posicao encontrada para o ano-base selecionado.
            </p>
          ) : (
            <div className="space-y-12">
              {groupedItems.ready.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Prontos para Declaracao
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {groupedItems.ready.map((item) => (
                      <ReportItemCard
                        key={item.ticker}
                        item={item}
                        onRepair={handleRepair}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedItems.pending.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Pendencias de Dados
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {groupedItems.pending.map((item) => (
                      <ReportItemCard
                        key={item.ticker}
                        item={item}
                        onRepair={handleRepair}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedItems.unsupported.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Outros Itens (Opcionais, Limites ou Nao Suportados)
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {groupedItems.unsupported.map((item) => (
                      <ReportItemCard
                        key={item.ticker}
                        item={item}
                        onRepair={handleRepair}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <EditAssetModal
        asset={editingAsset}
        isOpen={editingAsset !== null}
        onClose={() => setEditingAsset(null)}
        onSave={saveRepair}
        isSaving={isRepairing}
      />
    </section>
  );
}

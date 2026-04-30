import type { JSX } from 'react';
import { AssetType, ReportItemStatus } from '../../../shared/types/domain';
import type { AssetsReportItem } from '../../../shared/contracts/assets-report.contract';

interface ReportItemCardProps {
  item: AssetsReportItem;
  onRepair: (ticker: string) => Promise<void>;
  onCopy: (label: string, content: string) => Promise<void>;
}

const STATUS_CONFIG: Record<ReportItemStatus, { label: string; className: string }> = {
  [ReportItemStatus.Required]: { label: 'Obrigatorio', className: 'bg-blue-100 text-blue-800' },
  [ReportItemStatus.Optional]: { label: 'Opcional', className: 'bg-slate-100 text-slate-800' },
  [ReportItemStatus.BelowThreshold]: { label: 'Abaixo do Limite', className: 'bg-slate-100 text-slate-800' },
  [ReportItemStatus.Pending]: { label: 'Pendente', className: 'bg-amber-100 text-amber-800' },
  [ReportItemStatus.Unsupported]: { label: 'Nao Suportado', className: 'bg-rose-100 text-rose-800' },
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'Acoes',
  [AssetType.Fii]: 'FIIs',
  [AssetType.Etf]: 'ETFs',
  [AssetType.Bdr]: 'BDRs',
};

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReportItemCard({ item, onRepair, onCopy }: ReportItemCardProps): JSX.Element {
  const status = STATUS_CONFIG[item.status];

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${item.status === ReportItemStatus.Pending ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-slate-900">{item.ticker}</h4>
            <span className="text-sm text-slate-500">• {ASSET_TYPE_LABELS[item.assetType]}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {item.acquiredInYear && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Adquirido no ano
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Grupo {item.revenueClassification.group} • Codigo {item.revenueClassification.code}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Atual</p>
          <p className="text-lg font-bold text-slate-900">R$ {formatBrl(item.currentYearValue)}</p>
          <p className="text-xs text-slate-500">Anterior: R$ {formatBrl(item.previousYearValue)}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descricao / Pendencias</h5>
        <div className="mt-1">
          {item.description ? (
            <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <div className="space-y-1">
              {item.pendingIssues.map((issue, idx) => (
                <p key={idx} className="text-sm text-amber-700 font-medium">
                  • {issue.message}
                </p>
              ))}
              {item.status === ReportItemStatus.Unsupported && (
                <p className="text-sm text-rose-700 font-medium">
                  • {item.eligibilityReason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Corretoras</h5>
        <p className="mt-1 text-xs text-slate-600">
          {item.brokersSummary.map(b => `${b.brokerName} (${b.cnpj}): ${b.quantity}`).join('; ')}
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
        {item.status === ReportItemStatus.Pending && (
          <button
            type="button"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            onClick={() => {
              void onRepair(item.ticker);
            }}
          >
            Corrigir Dados
          </button>
        )}
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-30"
          disabled={!item.canCopy || !item.description}
          onClick={() => {
            if (item.description) {
              void onCopy(`Descricao de ${item.ticker}`, item.description);
            }
          }}
        >
          Copiar Descricao
        </button>
      </div>
    </div>
  );
}

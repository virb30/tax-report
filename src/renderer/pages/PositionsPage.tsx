import type { JSX } from 'react';
import { MigrateYearModal } from '../components/MigrateYearModal';
import { ImportConsolidatedPositionModal } from './ImportConsolidatedPositionModal';
import { PositionsTable } from './positions-page/PositionsTable';
import { usePositionsPage } from './positions-page/use-positions-page';

export function PositionsPage(): JSX.Element {
  const positionsPage = usePositionsPage();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Posições consolidadas</h2>
          <p className="mt-2 text-sm text-slate-600">
            Posição em 31/12/{positionsPage.baseYear}. Selecione o ano para filtrar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Ano:
            <select
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={positionsPage.baseYear}
              onChange={(event) => positionsPage.setBaseYear(Number(event.target.value))}
            >
              {positionsPage.yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={positionsPage.openImportConsolidatedModal}
          >
            Importar posição consolidada
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={positionsPage.openMigrateModal}
          >
            Migrar posições entre anos
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => void positionsPage.recalculateAllPositions()}
            disabled={positionsPage.recalculatingAll || positionsPage.positions.length === 0}
          >
            {positionsPage.recalculatingAll ? 'Recalculando...' : 'Recalcular todas'}
          </button>
        </div>
      </div>

      <ImportConsolidatedPositionModal
        isOpen={positionsPage.importConsolidatedModalOpen}
        onClose={() => positionsPage.setImportConsolidatedModalOpen(false)}
        onSuccess={positionsPage.refreshPositions}
      />

      <MigrateYearModal
        isOpen={positionsPage.migrateModalOpen}
        onClose={() => positionsPage.setMigrateModalOpen(false)}
        onSuccess={positionsPage.handleMigrateSuccess}
      />

      {positionsPage.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {positionsPage.errorMessage}
        </p>
      ) : null}

      <PositionsTable
        deletingTicker={positionsPage.deletingTicker}
        expandedTickers={positionsPage.expandedTickers}
        isLoading={positionsPage.isLoading}
        onDeletePosition={(ticker) => void positionsPage.deletePosition(ticker)}
        onRecalculatePosition={(ticker) => void positionsPage.recalculatePosition(ticker)}
        onToggleExpand={positionsPage.toggleExpand}
        positions={positionsPage.positions}
        recalculatingAll={positionsPage.recalculatingAll}
        recalculatingTicker={positionsPage.recalculatingTicker}
      />
    </section>
  );
}

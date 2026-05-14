import { useState } from 'react';
import type { JSX } from 'react';
import { BrokersPage } from './pages/BrokersPage';
import { ImportPage } from './pages/ImportPage';
import { InitialBalancePage } from './pages/InitialBalancePage';
import { PositionsPage } from './pages/PositionsPage';
import { ReportPage } from './pages/ReportPage';
import { AssetsPage } from './pages/AssetsPage';
import { type MonthlyTaxRepairNavigation, MonthlyTaxPage } from './pages/MonthlyTaxPage';

type MainTab =
  | 'import'
  | 'initial-balance'
  | 'positions'
  | 'monthly-tax'
  | 'report'
  | 'brokers'
  | 'assets';

type RepairContext = {
  targetTab: Extract<MainTab, 'import' | 'assets' | 'brokers'>;
  message: string;
};

const tabItems: Array<{ id: MainTab; label: string }> = [
  { id: 'import', label: 'Importacao e Conferencia' },
  { id: 'initial-balance', label: 'Saldo Inicial' },
  { id: 'positions', label: 'Posicoes' },
  { id: 'monthly-tax', label: 'Imposto Mensal' },
  { id: 'report', label: 'Relatorio Bens e Direitos' },
  { id: 'assets', label: 'Ativos' },
  { id: 'brokers', label: 'Corretoras' },
];

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<MainTab>('import');
  const [repairContext, setRepairContext] = useState<RepairContext | null>(null);

  const handleRepairNavigate = (navigation: MonthlyTaxRepairNavigation): void => {
    setRepairContext({
      targetTab: navigation.tab,
      message: navigation.message,
    });
    setActiveTab(navigation.tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Tax Report</h1>
          <p className="mt-2 text-sm text-slate-600">
            Fluxos do MVP conectados por API HTTP para importacao, base manual e relatorio anual.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {tabItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {repairContext && activeTab === repairContext.targetTab ? (
          <p
            role="status"
            className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800"
          >
            Reparo mensal: {repairContext.message}
          </p>
        ) : null}

        {activeTab === 'import' ? <ImportPage /> : null}
        {activeTab === 'initial-balance' ? <InitialBalancePage /> : null}
        {activeTab === 'positions' ? <PositionsPage /> : null}
        {activeTab === 'monthly-tax' ? (
          <MonthlyTaxPage onRepairNavigate={handleRepairNavigate} />
        ) : null}
        {activeTab === 'report' ? <ReportPage /> : null}
        {activeTab === 'assets' ? <AssetsPage /> : null}
        {activeTab === 'brokers' ? <BrokersPage /> : null}
      </main>
    </div>
  );
}

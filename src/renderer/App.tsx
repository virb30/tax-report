import { useState } from 'react';
import type { JSX } from 'react';
import { BrokersPage } from './pages/BrokersPage';
import { ImportPage } from './pages/ImportPage';
import { InitialBalancePage } from './pages/InitialBalancePage';
import { PositionsPage } from './pages/PositionsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ReportPage } from './pages/ReportPage';

type MainTab = 'import' | 'initial-balance' | 'positions' | 'report' | 'brokers' | 'monthly-assessment';

const tabItems: Array<{ id: MainTab; label: string }> = [
  { id: 'import', label: 'Importacao e Conferencia' },
  { id: 'initial-balance', label: 'Saldo Inicial' },
  { id: 'positions', label: 'Posicoes' },
  { id: 'report', label: 'Relatorio Bens e Direitos' },
  { id: 'brokers', label: 'Corretoras' },
  { id: 'monthly-assessment', label: 'Apuracao Mensal / DARF (v2)' },
];

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<MainTab>('import');

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Tax Report</h1>
          <p className="mt-2 text-sm text-slate-600">
            Fluxos do MVP conectados por IPC seguro para importacao, base manual e relatorio anual.
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

        {activeTab === 'import' ? <ImportPage /> : null}
        {activeTab === 'initial-balance' ? <InitialBalancePage /> : null}
        {activeTab === 'positions' ? <PositionsPage /> : null}
        {activeTab === 'report' ? <ReportPage /> : null}
        {activeTab === 'brokers' ? <BrokersPage /> : null}
        {activeTab === 'monthly-assessment' ? (
          <PlaceholderPage title="Apuracao Mensal / DARF (fora do MVP desta tarefa)" />
        ) : null}
      </main>
    </div>
  );
}

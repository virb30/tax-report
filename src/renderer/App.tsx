import { useEffect, useMemo, useState } from 'react';
import { AssetType } from '../shared/types/domain';
import type { ImportOperationsCommand } from '../shared/contracts/import-operations.contract';
import type { ListPositionsResult } from '../shared/contracts/list-positions.contract';
import type { GenerateAssetsReportResult } from '../shared/contracts/assets-report.contract';

type MainTab = 'import' | 'manual-base' | 'report' | 'monthly-assessment';

const tabItems: Array<{ id: MainTab; label: string }> = [
  { id: 'import', label: 'Importacao e Conferencia' },
  { id: 'manual-base', label: 'Gerenciar Preco Medio' },
  { id: 'report', label: 'Relatorio Bens e Direitos' },
  { id: 'monthly-assessment', label: 'Apuracao Mensal / DARF (v2)' },
];

function buildErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Falha inesperada. Revise os dados informados e tente novamente.';
}

function ImportPage(): JSX.Element {
  const [broker, setBroker] = useState('XP');
  const [filePath, setFilePath] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [previewCommands, setPreviewCommands] = useState<ImportOperationsCommand[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const previewSummary = useMemo(() => {
    let operationCount = 0;
    for (const command of previewCommands) {
      operationCount += command.operations.length;
    }
    return {
      commandCount: previewCommands.length,
      operationCount,
    };
  }, [previewCommands]);

  async function handlePreviewImport(): Promise<void> {
    setIsPreviewLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const previewResult = await window.electronApi.previewImportFromFile({
        broker,
        filePath,
      });
      setPreviewCommands(previewResult.commands);
      setFeedbackMessage('Conferencia gerada. Revise os dados e confirme a importacao.');
    } catch (error: unknown) {
      setPreviewCommands([]);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (previewCommands.length === 0) {
      setErrorMessage('Nenhuma operacao em conferencia para confirmar.');
      return;
    }
    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.confirmImportOperations({
        commands: previewCommands,
      });
      setFeedbackMessage(
        `Importacao concluida: ${result.createdOperationsCount} operacoes criadas e ${result.recalculatedPositionsCount} posicoes recalculadas.`,
      );
      setPreviewCommands([]);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsConfirmLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Importar arquivo com conferencia</h2>
      <p className="mt-2 text-sm text-slate-600">
        Informe a corretora e o caminho do arquivo CSV/XLSX para revisar antes de confirmar.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={broker}
            onChange={(event) => setBroker(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Caminho do arquivo
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={filePath}
            onChange={(event) => setFilePath(event.target.value)}
            placeholder="/caminho/arquivo.csv"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handlePreviewImport();
          }}
          disabled={isPreviewLoading || filePath.trim().length === 0}
        >
          {isPreviewLoading ? 'Gerando conferencia...' : 'Conferir arquivo'}
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() => {
            void handleConfirmImport();
          }}
          disabled={isConfirmLoading || previewCommands.length === 0}
        >
          {isConfirmLoading ? 'Confirmando...' : 'Confirmar importacao'}
        </button>
      </div>

      {feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedbackMessage}
        </p>
      ) : null}
      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      {previewCommands.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-700">
            Conferencia pronta: {previewSummary.commandCount} notas e {previewSummary.operationCount}{' '}
            operacoes.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Preco</th>
                </tr>
              </thead>
              <tbody>
                {previewCommands.flatMap((command) =>
                  command.operations.map((operation, index) => (
                    <tr key={`${command.tradeDate}-${operation.ticker}-${index}`} className="border-t">
                      <td className="px-3 py-2">{command.tradeDate}</td>
                      <td className="px-3 py-2">{operation.ticker}</td>
                      <td className="px-3 py-2">{operation.operationType}</td>
                      <td className="px-3 py-2">{operation.quantity}</td>
                      <td className="px-3 py-2">{operation.unitPrice}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ManualBasePage(): JSX.Element {
  const [ticker, setTicker] = useState('');
  const [broker, setBroker] = useState('XP');
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Stock);
  const [quantity, setQuantity] = useState('0');
  const [averagePrice, setAveragePrice] = useState('0');
  const [positions, setPositions] = useState<ListPositionsResult['items']>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  async function loadPositions(): Promise<void> {
    setIsLoadingPositions(true);
    try {
      const result = await window.electronApi.listPositions();
      setPositions(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoadingPositions(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, []);

  async function handleSaveManualBase(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      await window.electronApi.setManualBase({
        ticker,
        broker,
        assetType,
        quantity: Number(quantity),
        averagePrice: Number(averagePrice),
      });
      setFeedbackMessage('Base manual salva com sucesso.');
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Gerenciar base manual</h2>
      <p className="mt-2 text-sm text-slate-600">
        Defina quantidade e preco medio para ativos ja existentes na carteira.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ticker
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={broker}
            onChange={(event) => setBroker(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tipo de ativo
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={assetType}
            onChange={(event) => setAssetType(event.target.value as AssetType)}
          >
            <option value={AssetType.Stock}>Acoes</option>
            <option value={AssetType.Fii}>FII</option>
            <option value={AssetType.Etf}>ETF</option>
            <option value={AssetType.Bdr}>BDR</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Quantidade
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Preco medio
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={averagePrice}
            onChange={(event) => setAveragePrice(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handleSaveManualBase();
          }}
          disabled={isSaving || ticker.trim().length === 0}
        >
          {isSaving ? 'Salvando...' : 'Salvar base manual'}
        </button>
      </div>

      {feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedbackMessage}
        </p>
      ) : null}
      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-800">Posicoes atuais</h3>
        {isLoadingPositions ? <p className="mt-2 text-sm text-slate-600">Carregando...</p> : null}
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Corretora</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Preco medio</th>
                <th className="px-3 py-2">Custo total</th>
                <th className="px-3 py-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={`${position.ticker}-${position.broker}`} className="border-t">
                  <td className="px-3 py-2">{position.ticker}</td>
                  <td className="px-3 py-2">{position.broker}</td>
                  <td className="px-3 py-2">{position.quantity}</td>
                  <td className="px-3 py-2">{position.averagePrice.toFixed(2)}</td>
                  <td className="px-3 py-2">{position.totalCost.toFixed(2)}</td>
                  <td className="px-3 py-2">{position.isManualBase ? 'Manual' : 'Importacao'}</td>
                </tr>
              ))}
              {positions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    Nenhuma posicao cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ReportPage(): JSX.Element {
  const defaultBaseYear = new Date().getFullYear() - 1;
  const [baseYear, setBaseYear] = useState(String(defaultBaseYear));
  const [report, setReport] = useState<GenerateAssetsReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');

  async function handleGenerateReport(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    setCopiedMessage('');
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
  }

  async function handleCopy(label: string, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(`${label} copiado com sucesso.`);
    } catch (_error: unknown) {
      setCopiedMessage('Nao foi possivel copiar automaticamente. Selecione e copie manualmente.');
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Relatorio anual de bens e direitos</h2>
      <p className="mt-2 text-sm text-slate-600">
        Gere a posicao de 31/12 e copie os campos para a declaracao.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano-base
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={baseYear}
            onChange={(event) => setBaseYear(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handleGenerateReport();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Gerando...' : 'Gerar relatorio'}
        </button>
      </div>

      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
      {copiedMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {copiedMessage}
        </p>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-700">Data de referencia: {report.referenceDate}</p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Preco medio</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Grupo/Codigo</th>
                  <th className="px-3 py-2">Discriminacao</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={`${item.ticker}-${item.broker}`} className="border-t align-top">
                    <td className="px-3 py-2">{item.ticker}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.averagePrice.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.totalCost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {item.revenueClassification.group}/{item.revenueClassification.code}
                    </td>
                    <td className="space-y-2 px-3 py-2">
                      <p className="max-w-xl whitespace-pre-wrap">{item.description}</p>
                      <button
                        type="button"
                        className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
                        onClick={() => {
                          void handleCopy(`Discriminacao de ${item.ticker}`, item.description);
                        }}
                      >
                        Copiar discriminacao
                      </button>
                    </td>
                  </tr>
                ))}
                {report.items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={6}>
                      Nenhum ativo em carteira para o ano-base selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Este fluxo sera habilitado na v2 com regras completas de DARF e compensacao de prejuizo.
      </p>
    </section>
  );
}

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
        {activeTab === 'manual-base' ? <ManualBasePage /> : null}
        {activeTab === 'report' ? <ReportPage /> : null}
        {activeTab === 'monthly-assessment' ? (
          <PlaceholderPage title="Apuracao Mensal / DARF (fora do MVP desta tarefa)" />
        ) : null}
      </main>
    </div>
  );
}

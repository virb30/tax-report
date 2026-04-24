import type { JSX } from 'react';
import { ImportTemplateTable } from './import-page/ImportTemplateTable';
import { TransactionsPreviewTable } from './import-page/TransactionsPreviewTable';
import { useTransactionImport } from './import-page/use-transaction-import';

export function ImportPage(): JSX.Element {
  const transactionImport = useTransactionImport();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Importar transações (CSV/XLSX)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Selecione um arquivo CSV ou Excel com o modelo de planilha abaixo. A corretora deve estar
        cadastrada.
      </p>

      <ImportTemplateTable />

      <div className="mt-4 grid gap-3 md:grid-cols-1">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Arquivo selecionado
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2"
              value={transactionImport.filePath}
              readOnly
              placeholder="Nenhum arquivo selecionado"
            />
            <button
              type="button"
              className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
              onClick={() => void transactionImport.selectFile()}
              disabled={transactionImport.isSelectingFile}
            >
              {transactionImport.isSelectingFile ? 'Abrindo...' : 'Selecionar'}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => void transactionImport.previewImport()}
          disabled={transactionImport.isPreviewLoading || !transactionImport.filePath.trim()}
        >
          {transactionImport.isPreviewLoading ? 'Gerando conferência...' : 'Conferir arquivo'}
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() => void transactionImport.confirmImport()}
          disabled={
            transactionImport.isConfirmLoading || transactionImport.previewTransactions.length === 0
          }
        >
          {transactionImport.isConfirmLoading ? 'Confirmando...' : 'Confirmar importação'}
        </button>
      </div>

      {transactionImport.feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {transactionImport.feedbackMessage}
        </p>
      ) : null}
      {transactionImport.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {transactionImport.errorMessage}
        </p>
      ) : null}

      <TransactionsPreviewTable
        brokers={transactionImport.brokers}
        previewTransactions={transactionImport.previewTransactions}
      />
    </section>
  );
}

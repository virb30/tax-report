import type { JSX } from 'react';

const SPREADSHEET_MODEL_COLUMNS = [
  { name: 'Data', type: 'texto (YYYY-MM-DD)', required: true },
  { name: 'Entrada/Saída', type: 'texto (Crédito/Débito)', required: true },
  { name: 'Movimentação', type: 'texto', required: true },
  { name: 'Ticker', type: 'texto', required: true },
  { name: 'Quantidade', type: 'número', required: true },
  { name: 'Preço Unitário', type: 'número', required: true },
  { name: 'Corretora', type: 'texto (código, ex: XP, CLEAR)', required: true },
] as const;

function describeColumn(name: string): string {
  switch (name) {
    case 'Data':
      return 'Data do pregão';
    case 'Entrada/Saída':
      return 'Direção do fluxo financeiro (Crédito ou Débito)';
    case 'Movimentação':
      return 'Tipo oficial da B3 (ex: Transferência - Liquidação, Bonificação em ativos)';
    case 'Ticker':
      return 'Código do ativo (ex: PETR4)';
    case 'Quantidade':
      return 'Quantidade negociada';
    case 'Preço Unitário':
      return 'Preço por unidade';
    case 'Corretora':
      return 'Código da corretora (ex: XP, CLEAR)';
    default:
      return '';
  }
}

export function ImportTemplateTable(): JSX.Element {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-slate-700">Modelo de planilha (colunas)</h3>
      <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Coluna</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Obrigatória</th>
              <th className="px-3 py-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {SPREADSHEET_MODEL_COLUMNS.map((column) => (
              <tr key={column.name} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{column.name}</td>
                <td className="px-3 py-2">{column.type}</td>
                <td className="px-3 py-2">{column.required ? 'Sim' : 'Não'}</td>
                <td className="px-3 py-2 text-slate-600">{describeColumn(column.name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

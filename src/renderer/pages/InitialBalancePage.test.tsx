import '@testing-library/jest-dom';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  InitialBalanceDocument,
  ListInitialBalanceDocumentsResult,
} from '../../shared/contracts/initial-balance.contract';
import type {
  ListPositionsResult,
  PositionListItem,
} from '../../shared/contracts/list-positions.contract';
import { AssetType } from '../../shared/types/domain';
import type { ElectronApi } from '../../shared/types/electron-api';
import { listActiveBrokers } from '../services/api/list-brokers';
import { InitialBalancePage } from './InitialBalancePage';
import mock, { mockReset } from 'jest-mock-extended/lib/Mock';

jest.mock('../services/api/list-brokers', () => ({
  listActiveBrokers: jest.fn(),
}));

const mockedListActiveBrokers = jest.mocked(listActiveBrokers);

function createDocument(overrides: Partial<InitialBalanceDocument> = {}): InitialBalanceDocument {
  return {
    ticker: 'IVVB11',
    year: 2025,
    assetType: AssetType.Etf,
    name: 'iShares Core S&P 500',
    cnpj: '11.111.111/0001-11',
    averagePrice: '300',
    allocations: [
      { brokerId: 'broker-xp', quantity: '2' },
      { brokerId: 'broker-rico', quantity: '1' },
    ],
    totalQuantity: '3',
    ...overrides,
  };
}

function createDocumentsResult(items: InitialBalanceDocument[]): ListInitialBalanceDocumentsResult {
  return {
    ok: true,
    data: { items },
  };
}

function createPositionsResult(items: PositionListItem[]): ListPositionsResult {
  return {
    ok: true,
    data: { items },
  };
}

function getInput(label: string): HTMLInputElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected "${label}" to be an input element.`);
  }

  return element;
}

function getSelect(label: string): HTMLSelectElement {
  const element = screen.getByLabelText(label);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Expected "${label}" to be a select element.`);
  }

  return element;
}

describe('InitialBalancePage', () => {
  const electronApi = mock<ElectronApi>();

  beforeEach(() => {
    mockReset(electronApi);
    (electronApi as ElectronApi).appName = 'tax-report';
    window.electronApi = electronApi as ElectronApi;

    mockedListActiveBrokers.mockResolvedValue([
      { id: 'broker-xp', name: 'XP', cnpj: '00.000.000/0001-00', code: 'XP', active: true },
      { id: 'broker-rico', name: 'Rico', cnpj: '11.111.111/0001-11', code: 'RICO', active: true },
    ]);
    electronApi.listInitialBalanceDocuments.mockResolvedValue(createDocumentsResult([]));
    electronApi.listPositions.mockResolvedValue(createPositionsResult([]));
    electronApi.saveInitialBalanceDocument.mockResolvedValue({
      ok: true,
      data: createDocument(),
    });
    electronApi.deleteInitialBalanceDocument.mockResolvedValue({
      ok: true,
      data: { deleted: true },
    });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads brokers, saved documents, and positions on mount', async () => {
    electronApi.listInitialBalanceDocuments.mockResolvedValueOnce(
      createDocumentsResult([createDocument()]),
    );
    electronApi.listPositions.mockResolvedValueOnce(
      createPositionsResult([
        {
          ticker: 'PETR4',
          assetType: AssetType.Stock,
          totalQuantity: '10',
          averagePrice: '30',
          totalCost: '300',
          brokerBreakdown: [],
        },
      ]),
    );

    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora 1').value).toBe('broker-xp');
    });

    expect(screen.getByText('Documentos salvos de saldo inicial')).toBeInTheDocument();
    expect(screen.getByText('Posições em 31/12/2025')).toBeInTheDocument();
    expect(screen.getByText('IVVB11')).toBeInTheDocument();
    expect(screen.getByText('PETR4')).toBeInTheDocument();
    expect(electronApi.listInitialBalanceDocuments).toHaveBeenCalledWith({ year: 2025 });
    expect(electronApi.listPositions).toHaveBeenCalledWith({ baseYear: 2025 });
  });

  it('saves multiple allocations, refreshes documents, and clears the editor', async () => {
    electronApi.listInitialBalanceDocuments
      .mockResolvedValueOnce(createDocumentsResult([]))
      .mockResolvedValueOnce(createDocumentsResult([createDocument()]));
    electronApi.listPositions
      .mockResolvedValueOnce(createPositionsResult([]))
      .mockResolvedValueOnce(
        createPositionsResult([
          {
            ticker: 'IVVB11',
            assetType: AssetType.Etf,
            totalQuantity: '3',
            averagePrice: '300',
            totalCost: '900',
            brokerBreakdown: [],
          },
        ]),
      );

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora 1').value).toBe('broker-xp');
    });

    await user.type(getInput('Ticker'), 'ivvb11');
    await user.type(getInput('Nome do emissor'), 'iShares Core S&P 500');
    await user.type(getInput('CNPJ'), '11.111.111/0001-11');
    await user.clear(getInput('Preço médio global (R$)'));
    await user.type(getInput('Preço médio global (R$)'), '300');
    await user.clear(getInput('Quantidade'));
    await user.type(getInput('Quantidade'), '2');
    await user.click(screen.getByRole('button', { name: 'Adicionar alocação' }));
    await user.selectOptions(getSelect('Corretora 2'), 'broker-rico');
    await user.type(screen.getAllByLabelText('Quantidade')[1], '1');
    await user.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial cadastrado com sucesso.')).toBeInTheDocument();
    });

    expect(electronApi.saveInitialBalanceDocument).toHaveBeenCalledWith({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Stock,
      name: 'iShares Core S&P 500',
      cnpj: '11.111.111/0001-11',
      averagePrice: '300',
      allocations: [
        { brokerId: 'broker-xp', quantity: '2' },
        { brokerId: 'broker-rico', quantity: '1' },
      ],
    });
    expect(getInput('Ticker').value).toBe('');
    expect(screen.getByText('XP: 2.00')).toBeInTheDocument();
    expect(screen.getByText('Rico: 1.00')).toBeInTheDocument();
  });

  it('preloads an existing document for editing and replaces it on save', async () => {
    const existingDocument = createDocument();
    const replacedDocument = createDocument({
      averagePrice: '320',
      allocations: [
        { brokerId: 'broker-xp', quantity: '5' },
        { brokerId: 'broker-rico', quantity: '2' },
      ],
      totalQuantity: '7',
    });

    electronApi.listInitialBalanceDocuments
      .mockResolvedValueOnce(createDocumentsResult([existingDocument]))
      .mockResolvedValueOnce(createDocumentsResult([replacedDocument]));
    electronApi.listPositions
      .mockResolvedValueOnce(createPositionsResult([]))
      .mockResolvedValueOnce(createPositionsResult([]));
    electronApi.saveInitialBalanceDocument.mockResolvedValueOnce({
      ok: true,
      data: replacedDocument,
    });

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(screen.getByText('IVVB11')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Atualizar saldo inicial' })).toBeInTheDocument();
    });

    expect(getInput('Ticker').value).toBe('IVVB11');
    expect(getInput('Nome do emissor').value).toBe('iShares Core S&P 500');
    expect(getInput('CNPJ').value).toBe('11.111.111/0001-11');
    expect(screen.getAllByLabelText('Quantidade')[0]).toHaveValue(2);
    expect(screen.getAllByLabelText('Quantidade')[1]).toHaveValue(1);

    await user.clear(getInput('Preço médio global (R$)'));
    await user.type(getInput('Preço médio global (R$)'), '320');
    await user.clear(screen.getAllByLabelText('Quantidade')[0]);
    await user.type(screen.getAllByLabelText('Quantidade')[0], '5');
    await user.clear(screen.getAllByLabelText('Quantidade')[1]);
    await user.type(screen.getAllByLabelText('Quantidade')[1], '2');
    await user.click(screen.getByRole('button', { name: 'Atualizar saldo inicial' }));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial atualizado com sucesso.')).toBeInTheDocument();
    });

    expect(electronApi.saveInitialBalanceDocument).toHaveBeenCalledWith({
      ticker: 'IVVB11',
      year: 2025,
      assetType: AssetType.Etf,
      name: 'iShares Core S&P 500',
      cnpj: '11.111.111/0001-11',
      averagePrice: '320',
      allocations: [
        { brokerId: 'broker-xp', quantity: '5' },
        { brokerId: 'broker-rico', quantity: '2' },
      ],
    });
    expect(screen.getByText('XP: 5.00')).toBeInTheDocument();
    expect(screen.getByText('Rico: 2.00')).toBeInTheDocument();
  });

  it('deletes a saved document and removes it from the table after refresh', async () => {
    const savedDocument = createDocument();

    electronApi.listInitialBalanceDocuments
      .mockResolvedValueOnce(createDocumentsResult([savedDocument]))
      .mockResolvedValueOnce(createDocumentsResult([]));
    electronApi.listPositions
      .mockResolvedValueOnce(createPositionsResult([]))
      .mockResolvedValueOnce(createPositionsResult([]));

    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(screen.getByText('IVVB11')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(screen.getByText('Saldo inicial excluído com sucesso.')).toBeInTheDocument();
    });

    expect(electronApi.deleteInitialBalanceDocument).toHaveBeenCalledWith({
      ticker: 'IVVB11',
      year: 2025,
    });
    expect(
      screen.getByText('Nenhum documento de saldo inicial salvo para 2025.'),
    ).toBeInTheDocument();
  });

  it('rejects missing broker or quantity issues and keeps positions separated from documents', async () => {
    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora 1').value).toBe('broker-xp');
    });

    await user.type(getInput('Ticker'), 'PETR4');
    await user.click(screen.getByRole('button', { name: 'Adicionar alocação' }));
    await user.type(screen.getAllByLabelText('Quantidade')[1], '1');

    expect(screen.getByRole('button', { name: 'Salvar saldo inicial' })).toBeDisabled();

    await user.selectOptions(getSelect('Corretora 2'), 'broker-rico');
    await user.clear(getInput('Preço médio global (R$)'));
    await user.type(getInput('Preço médio global (R$)'), '10');
    await user.clear(screen.getAllByLabelText('Quantidade')[0]);
    await user.type(screen.getAllByLabelText('Quantidade')[0], '0');
    await user.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));

    await waitFor(() => {
      expect(
        screen.getByText('Quantidade deve ser maior que zero em todas as alocações.'),
      ).toBeInTheDocument();
    });

    expect(electronApi.saveInitialBalanceDocument).not.toHaveBeenCalled();
    expect(screen.getByText('Documentos salvos de saldo inicial')).toBeInTheDocument();
    expect(screen.getByText('Posições em 31/12/2025')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Esta tabela mostra a posição consolidada do ano, separada dos documentos editáveis acima.',
      ),
    ).toBeInTheDocument();
  });

  it('renders optional issuer fields and keeps them editable when no catalog metadata exists', async () => {
    const user = userEvent.setup();
    render(<InitialBalancePage />);

    await waitFor(() => {
      expect(getSelect('Corretora 1').value).toBe('broker-xp');
    });

    expect(getInput('Nome do emissor')).toHaveValue('');
    expect(getInput('CNPJ')).toHaveValue('');

    await user.type(getInput('Nome do emissor'), 'Ambev');
    await user.type(getInput('CNPJ'), '07.526.557/0001-00');

    expect(getInput('Nome do emissor')).toHaveValue('Ambev');
    expect(getInput('CNPJ')).toHaveValue('07.526.557/0001-00');
  });
});

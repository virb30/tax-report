import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportConsolidatedPositionModal } from './ImportConsolidatedPositionModal';
import { AssetType, AssetResolutionStatus } from '@/types/api.types';
import {
  createTaxReportApiMock,
  installTaxReportApiMock,
  type TaxReportApiMock,
} from '../test/create-tax-report-api-mock';

function getButton(name: string): HTMLButtonElement {
  const element = screen.getByRole('button', { name });
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected "${name}" to be a button element.`);
  }

  return element;
}

describe('ImportConsolidatedPositionModal', () => {
  let api: TaxReportApiMock;

  beforeEach(() => {
    api = createTaxReportApiMock();
    installTaxReportApiMock(api);
  });

  it('does not render when closed', () => {
    render(
      <ImportConsolidatedPositionModal isOpen={false} onClose={jest.fn()} onSuccess={jest.fn()} />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('selects a file, loads preview rows and confirms import', async () => {
    const file = new File(['ticker,quantity'], 'positions.csv', { type: 'text/csv' });
    api.previewConsolidatedPosition.mockResolvedValue({
      ok: true,
      data: {
        rows: [
          {
            ticker: 'PETR4',
            quantity: 10,
            averagePrice: 30,
            brokerCode: 'XP',
            sourceAssetType: AssetType.Stock,
            resolvedAssetType: AssetType.Stock,
            resolutionStatus: AssetResolutionStatus.ResolvedFromFile,
            needsReview: false,
            unsupportedReason: null,
          },
        ],
        summary: {
          supportedRows: 1,
          pendingRows: 1,
          unsupportedRows: 0,
        },
      },
    });
    api.importConsolidatedPosition.mockResolvedValue({
      ok: true,
      data: {
        importedCount: 1,
        recalculatedTickers: ['PETR4'],
        skippedUnsupportedRows: 0,
      },
    });

    const onSuccess = jest.fn();
    const user = userEvent.setup();
    render(<ImportConsolidatedPositionModal isOpen onClose={jest.fn()} onSuccess={onSuccess} />);

    await user.upload(screen.getByLabelText('Selecionar arquivo'), file);

    await waitFor(() => {
      expect(screen.getByText('PETR4')).toBeTruthy();
    });
    expect(api.previewConsolidatedPosition).toHaveBeenCalledWith({
      file,
    });

    await user.click(getButton('Confirmar importação'));

    await waitFor(() => {
      expect(api.importConsolidatedPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          year: expect.any(Number),
          assetTypeOverrides: [],
        }),
      );
    });
    expect(screen.getByText(/1 alocação\(ões\) importada\(s\)/)).toBeTruthy();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows preview error and keeps confirmation disabled when preview result fails', async () => {
    const file = new File(['invalid'], 'positions.csv', { type: 'text/csv' });
    api.previewConsolidatedPosition.mockResolvedValue({
      ok: false,
      error: {
        code: 'INVALID_CONSOLIDATED_POSITION_FILE',
        kind: 'validation',
        message: 'Planilha inválida.',
      },
    });

    const user = userEvent.setup();
    render(<ImportConsolidatedPositionModal isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.upload(screen.getByLabelText('Selecionar arquivo'), file);

    await waitFor(() => {
      expect(screen.getByText('Planilha inválida.')).toBeTruthy();
    });
    expect(getButton('Confirmar importação').disabled).toBe(true);
  });
});

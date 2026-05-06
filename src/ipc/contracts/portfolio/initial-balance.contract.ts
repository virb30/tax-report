import type { AssetType } from '../domain';
import type { IpcResult } from '../../ipc-result';

export type InitialBalanceAllocationInput = {
  brokerId: string;
  quantity: string;
};

export type InitialBalanceDocument = {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string | null;
  cnpj?: string | null;
  averagePrice: string;
  allocations: InitialBalanceAllocationInput[];
  totalQuantity: string;
};

export type SaveInitialBalanceDocumentCommand = {
  ticker: string;
  year: number;
  assetType: AssetType;
  name?: string;
  cnpj?: string;
  averagePrice: string;
  allocations: InitialBalanceAllocationInput[];
};

export type SaveInitialBalanceDocumentResult = IpcResult<InitialBalanceDocument>;

export type ListInitialBalanceDocumentsQuery = {
  year: number;
};

export type ListInitialBalanceDocumentsData = {
  items: InitialBalanceDocument[];
};

export type ListInitialBalanceDocumentsResult = IpcResult<ListInitialBalanceDocumentsData>;

export type DeleteInitialBalanceDocumentCommand = {
  ticker: string;
  year: number;
};

export type DeleteInitialBalanceDocumentData = {
  deleted: boolean;
};

export type DeleteInitialBalanceDocumentResult = IpcResult<DeleteInitialBalanceDocumentData>;

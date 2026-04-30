import type { AssetType } from '../types/domain';
import type { IpcResult } from '../ipc/ipc-result';

export type InitialBalanceAllocationInput = {
  brokerId: string;
  quantity: number;
};

export type InitialBalanceDocument = {
  ticker: string;
  year: number;
  assetType: AssetType;
  averagePrice: number;
  allocations: InitialBalanceAllocationInput[];
  totalQuantity: number;
};

export type SaveInitialBalanceDocumentCommand = {
  ticker: string;
  year: number;
  assetType: AssetType;
  averagePrice: number;
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

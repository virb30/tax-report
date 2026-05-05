import type {
  AssetType,
  CapitalGainsAssetCategory,
  SourceType,
  TransactionType,
} from '../../../../shared/types/domain';

export interface FindCapitalGainsAssessmentFactsInput {
  baseYear: number;
}

export interface CapitalGainsAssessmentTransactionFact {
  id: string;
  date: string;
  ticker: string;
  assetType: AssetType | null;
  category: CapitalGainsAssetCategory | null;
  transactionType: TransactionType;
  quantity: number;
  unitPrice: number;
  grossValue: number;
  brokerId: string | null;
  sourceType: SourceType;
  externalRef: string | null;
}

export interface CapitalGainsAssessmentFeeFact {
  id: string;
  transactionId: string;
  amount: number;
}

export interface CapitalGainsAssessmentBrokerTaxFact {
  id: string;
  date: string;
  brokerId: string | null;
  fees: number;
  irrf: number;
}

export interface CapitalGainsAssessmentAssetFact {
  ticker: string;
  assetType: AssetType | null;
  category: CapitalGainsAssetCategory | null;
  name: string | null;
  cnpj: string | null;
}

export interface CapitalGainsAssessmentFacts {
  baseYear: number;
  transactions: CapitalGainsAssessmentTransactionFact[];
  fees: CapitalGainsAssessmentFeeFact[];
  brokerTaxes: CapitalGainsAssessmentBrokerTaxFact[];
  assets: CapitalGainsAssessmentAssetFact[];
}

export interface CapitalGainsAssessmentQuery {
  findSourceFacts(
    input: FindCapitalGainsAssessmentFactsInput,
  ): Promise<CapitalGainsAssessmentFacts>;
}

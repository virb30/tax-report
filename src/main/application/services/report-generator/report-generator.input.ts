import { AssetPosition } from "../../../domain/portfolio/entities/asset-position.entity";
import { Broker } from "../../../domain/portfolio/entities/broker.entity";

export interface ReportItemInput {
  position: AssetPosition;
  brokersMap: Map<string, Broker>;
  issuerCnpj: string;
}
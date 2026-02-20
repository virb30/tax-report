export type SpreadsheetRow = Record<string, string | number | null | undefined>;

export type RawSpreadsheetDto = {
  rows: SpreadsheetRow[];
};

export interface SpreadsheetFileReader {
  read(filePath: string): Promise<RawSpreadsheetDto>;
}

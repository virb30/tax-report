import fs from 'node:fs';
import path from 'node:path';

function parseEnvironmentValue(rawValue: string): string {
  const trimmedValue = rawValue.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
}

function parseEnvironmentLine(line: string): { key: string; value: string } | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const value = parseEnvironmentValue(trimmedLine.slice(separatorIndex + 1));

  if (!key) {
    return null;
  }

  return { key, value };
}

export function loadBackendEnvironment(currentDirectory: string = process.cwd()): void {
  const environmentFilePath = path.resolve(currentDirectory, '.env');

  if (!fs.existsSync(environmentFilePath)) {
    return;
  }

  const fileContents = fs.readFileSync(environmentFilePath, 'utf8');

  for (const line of fileContents.split(/\r?\n/u)) {
    const parsedLine = parseEnvironmentLine(line);

    if (!parsedLine) {
      continue;
    }

    if (process.env[parsedLine.key] === undefined) {
      process.env[parsedLine.key] = parsedLine.value;
    }
  }
}

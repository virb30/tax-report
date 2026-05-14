import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface PackageJson {
  scripts: Record<string, string>;
}

const frontendRoot = path.resolve(__dirname, '../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const frontendReadmePath = path.join(frontendRoot, 'README.md');
const rootReadmePath = path.join(repositoryRoot, 'README.md');

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readPackageJson(filePath: string): PackageJson {
  const parsed = JSON.parse(readText(filePath)) as unknown;

  if (!isPackageJson(parsed)) {
    throw new Error(`Invalid package.json shape: ${filePath}`);
  }

  return parsed;
}

function isPackageJson(value: unknown): value is PackageJson {
  if (typeof value !== 'object' || value === null || !('scripts' in value)) {
    return false;
  }

  const scripts = value.scripts;
  return typeof scripts === 'object' && scripts !== null;
}

describe('frontend project documentation', () => {
  it('documents only frontend scripts that exist in package.json', () => {
    const readme = readText(frontendReadmePath);
    const packageJson = readPackageJson(path.join(frontendRoot, 'package.json'));

    for (const scriptName of Object.keys(packageJson.scripts)) {
      expect(readme).toContain(`npm run ${scriptName}`);
    }
  });

  it('documents API base URL and browser import expectations', () => {
    const readme = readText(frontendReadmePath);

    expect(readme).toContain('defaults to `/api`');
    expect(readme).toContain('browser file selection');
    expect(readme).toContain('multipart upload');
  });

  it('documents privacy guidance for tax and financial data', () => {
    const documentation = `${readText(rootReadmePath)}\n${readText(frontendReadmePath)}`;

    expect(documentation).toMatch(/uploaded\s+CSV\/XLSX\s+contents/);
    expect(documentation).toContain('parsed tax rows');
    expect(documentation).toContain('CNPJ values');
    expect(documentation).toContain('financial data');
  });

  it('documents Phase 1 desktop migration and offline-first boundaries', () => {
    const documentation = `${readText(rootReadmePath)}\n${readText(frontendReadmePath)}`;

    expect(documentation).toContain('Desktop data migration is out of scope for Phase 1');
    expect(documentation).toMatch(/Offline-first operation is\s+also out of scope for Phase 1/);
  });

  it('runs the documented frontend browser workflow verification command', () => {
    execFileSync(
      'npm',
      ['run', 'test', '--', '--runTestsByPath', 'src/App.e2e.test.tsx', '--coverage=false'],
      {
        cwd: frontendRoot,
        stdio: 'pipe',
      },
    );
  });
});

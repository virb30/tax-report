import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

interface RootPackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const backendRoot = path.resolve(__dirname, '../../../..');
const repositoryRoot = path.resolve(backendRoot, '..');
const retiredRootFiles = [
  'forge.config.ts',
  'vite.main.config.ts',
  'vite.preload.config.ts',
  'vite.renderer.config.ts',
  'vite.config.ts',
  'jest.config.ts',
  'tailwind.config.ts',
  'eslint.config.mjs',
  'package-lock.json',
];
const retiredPackageNames = [
  ['electron'].join(''),
  ['electron', 'forge'].join('-'),
  ['electron', 'rebuild'].join('-'),
];
const retiredCommandTerms = [
  ['electron', 'forge'].join('-'),
  ['electron', 'rebuild'].join('-'),
  ['remote', 'debugging', 'port'].join('-'),
];
const retiredSourceTerms = [
  ['window', 'electronApi'].join('.'),
  ['Browser', 'Window'].join(''),
  ['src', 'ipc'].join('/'),
  ['src', 'preload'].join('/'),
  ['ipc', 'public'].join('/'),
];

describe('web-only distribution boundary', () => {
  it('removes root desktop runtime configuration from the active product path', () => {
    const existingFiles = retiredRootFiles.filter((fileName) =>
      existsSync(path.join(repositoryRoot, fileName)),
    );

    expect(existingFiles).toEqual([]);
    expect(existsSync(path.join(repositoryRoot, 'src'))).toBe(false);
  });

  it('keeps root package metadata free of desktop scripts and dependencies', () => {
    const packageJson = readRootPackageJson();
    const scripts = packageJson.scripts ?? {};
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const dependencyNames = Object.keys(dependencies);
    const scriptEntries = Object.entries(scripts).map(([scriptName, command]) => ({
      scriptName,
      command,
    }));

    expect(scriptEntries).toEqual([]);
    expect(
      dependencyNames.filter((dependencyName) =>
        retiredPackageNames.some((retiredName) => dependencyName.includes(retiredName)),
      ),
    ).toEqual([]);
    expect(
      scriptEntries.filter(({ command }) =>
        retiredCommandTerms.some((retiredTerm) => command.includes(retiredTerm)),
      ),
    ).toEqual([]);
  });

  it('keeps backend and frontend source out of retired desktop transport imports', () => {
    const sourceRoots = [
      path.join(repositoryRoot, 'backend', 'src'),
      path.join(repositoryRoot, 'frontend', 'src'),
    ];
    const sourceFiles = sourceRoots.flatMap((sourceRoot) => collectSourceFiles(sourceRoot));
    const offenders = sourceFiles.filter((sourceFile) => {
      const content = readFileSync(sourceFile, 'utf8');
      return retiredSourceTerms.some((term) => content.includes(term));
    });

    expect(offenders.map((filePath) => path.relative(repositoryRoot, filePath))).toEqual([]);
  });
});

function readRootPackageJson(): RootPackageJson {
  return JSON.parse(
    readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
  ) as RootPackageJson;
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    const entryStats = statSync(entryPath);

    if (entryStats.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    if (!entryPath.endsWith('.ts') && !entryPath.endsWith('.tsx')) {
      return [];
    }

    return [entryPath];
  });
}

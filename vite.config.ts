import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export const rendererAlias = {
  '@renderer': path.resolve(rootDirectory, 'src/renderer'),
  '@main': path.resolve(rootDirectory, 'src/main'),
  '@shared': path.resolve(rootDirectory, 'src/shared'),
};

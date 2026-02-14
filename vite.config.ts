import path from 'node:path';

const rootDirectory = __dirname;

export const rendererAlias = {
  '@renderer': path.resolve(rootDirectory, 'src/renderer'),
  '@main': path.resolve(rootDirectory, 'src/main'),
  '@shared': path.resolve(rootDirectory, 'src/shared'),
};

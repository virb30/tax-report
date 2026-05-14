import { createBackendRuntimeConfig } from './app/infra/runtime/backend-runtime-config';
import { loadBackendEnvironment } from './app/infra/runtime/load-backend-environment';
import { createBackendApp } from './http/app';

async function bootstrap(): Promise<void> {
  loadBackendEnvironment();
  const config = createBackendRuntimeConfig();
  const backend = await createBackendApp({ config });

  backend.app.listen(config.port, () => {
    console.log(`Tax Report backend listening on port ${config.port}`);
  });
}

void bootstrap().catch((error: unknown) => {
  console.error('Failed to start Tax Report backend', error);
  process.exitCode = 1;
});

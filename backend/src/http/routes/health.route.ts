import type { Router } from 'express';

export function registerHealthRoute(router: Router): void {
  router.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'ok',
    });
  });
}

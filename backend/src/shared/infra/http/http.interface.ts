import type { Request } from 'express';

export type HttpMethod = 'post' | 'put' | 'get' | 'delete' | 'patch' | 'options';

export interface HttpRequest {
  params: Record<string, unknown>;
  query: unknown;
  body: unknown;
  raw: Request;
}

export interface HttpResponse<TBody = unknown> {
  statusCode: number;
  body: TBody;
}

export type HttpMiddlewareSpec = {
  type: 'spreadsheetUpload';
  fieldName: string;
};

export interface HttpRoute {
  method: HttpMethod;
  // Use `{param}` for dynamic segments. Adapters translate to framework-specific syntax.
  path: string;
  middlewares?: HttpMiddlewareSpec[];
  handler(request: HttpRequest): Promise<HttpResponse>;
}

export interface Http {
  on(route: HttpRoute): void;
  listen(port: number, callback?: () => void): void;
}

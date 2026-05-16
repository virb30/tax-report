import type { Http, HttpRoute } from './http.interface';

export class RecordingMemoryAdapterHttp implements Http {
  readonly routes: HttpRoute[] = [];

  on(route: HttpRoute): void {
    this.routes.push(route);
  }

  listen(port: number, callback?: () => void): void {
    void port;
    void callback;
  }
}

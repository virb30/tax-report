import { jest } from '@jest/globals';

interface WindowStub {
  loadURL: jest.Mock<(url: string) => Promise<void>>;
  loadFile: jest.Mock<(filePath: string) => Promise<void>>;
};

export class BrowserWindowStub implements WindowStub {
  static lastOptions: unknown;
  static instances: BrowserWindowStub[] = [];

  static get instance(): BrowserWindowStub {
    return BrowserWindowStub.instances[0];
  }

  constructor(options: unknown) {
    BrowserWindowStub.lastOptions = options;
    BrowserWindowStub.instances.push(this);
  }

  loadURL = jest.fn<(url:string) => Promise<void>>().mockResolvedValue(undefined);
  loadFile = jest.fn<(filePath: string) => Promise<void>>().mockResolvedValue(undefined);

  static clear() {
    BrowserWindowStub.instances = [];
    BrowserWindowStub.lastOptions = undefined;
  }
}
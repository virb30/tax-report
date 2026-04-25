import EventEmitter from 'events';
import { jest } from '@jest/globals';

export class ElectronAppStub extends EventEmitter {
  private isReady = false;

  async whenReady() {
    return new Promise<void>((resolve) => {
      if (this.isReady) resolve();
      else this.once('ready', resolve);
    });
  }

  simulateReady() {
    this.isReady = true;
    this.emit('ready');
  }

  quit = jest.fn();
}
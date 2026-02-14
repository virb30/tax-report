type AppLifecycleEvent = 'activate' | 'window-all-closed';

type AppLike = {
  on: (event: AppLifecycleEvent, listener: () => void) => void;
  whenReady: () => Promise<void>;
  quit: () => void;
};

type BrowserWindowLike = {
  getAllWindows: () => unknown[];
};

type AppLifecycleDependencies = {
  app: AppLike;
  browserWindow: BrowserWindowLike;
  createMainWindow: () => void;
  platform: NodeJS.Platform;
};

export class AppLifecycle {
  constructor(private readonly dependencies: AppLifecycleDependencies) {}

  register(): void {
    const { app } = this.dependencies;

    void app
      .whenReady()
      .then(() => {
        this.dependencies.createMainWindow();

        app.on('activate', () => {
          const openedWindows = this.dependencies.browserWindow.getAllWindows();
          if (openedWindows.length === 0) {
            this.dependencies.createMainWindow();
          }
        });
      })
      .catch((error: unknown) => {
        // Keep startup failures visible instead of exiting silently.
        console.error('[main] Failed to initialize application lifecycle:', error);
        app.quit();
      });

    app.on('window-all-closed', () => {
      if (this.dependencies.platform !== 'darwin') {
        app.quit();
      }
    });
  }
}

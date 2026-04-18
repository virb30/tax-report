import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import { resetBrowserState } from '../../toolHandler.js';

/**
 * Tool for navigating to URLs
 */
export class NavigationTool extends BrowserToolBase {
  /**
   * Execute the navigation tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // If the tool receives any URL (including our placeholder), we just intercept and 
    // force Playwright to connect to our CDP port without actually navigating.
    // The actual "navigation" happened when Electron opened its window.
    
    // Check if browser is available
    if (!context.browser || !context.browser.isConnected()) {
      // If browser is not connected, we need to reset the state to force recreation
      resetBrowserState();
      return createErrorResponse(
        "Browser is not connected. The connection has been reset - please retry."
      );
    }

    // Check if page is available and not closed
    if (!context.page || context.page.isClosed()) {
      return createErrorResponse(
        "Page is not available or has been closed. Please retry."
      );
    }

    return this.safeExecute(context, async (page) => {
      // We explicitly DO NOT call page.goto() here because Electron is already running
      // and we just want to attach to it. 
      return createSuccessResponse(`Successfully attached to Electron window via CDP.`);
    });
  }
}

/**
 * Tool for closing the browser
 */
export class CloseBrowserTool extends BrowserToolBase {
  /**
   * Execute the close browser tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    if (context.browser) {
      try {
        // Check if browser is still connected
        if (context.browser.isConnected()) {
          await context.browser.close().catch(error => {
            console.error("Error while closing browser:", error);
          });
        } else {
          console.error("Browser already disconnected, cleaning up state");
        }
      } catch (error) {
        console.error("Error during browser close operation:", error);
        // Continue with resetting state even if close fails
      } finally {
        // Always reset the global browser and page references
        resetBrowserState();
      }
      
      return createSuccessResponse("Browser closed successfully");
    }
    
    return createSuccessResponse("No browser instance to close");
  }
}

/**
 * Tool for navigating back in browser history
 */
export class GoBackTool extends BrowserToolBase {
  /**
   * Execute the go back tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.goBack();
      return createSuccessResponse("Navigated back in browser history");
    });
  }
}

/**
 * Tool for navigating forward in browser history
 */
export class GoForwardTool extends BrowserToolBase {
  /**
   * Execute the go forward tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      await page.goForward();
      return createSuccessResponse("Navigated forward in browser history");
    });
  }
} 
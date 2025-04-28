/**
 * Simple logger utility for the application
 */
export class Logger {
  private context: string;
  private static debugEnabled = true; // Enable debug by default

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Enable or disable debug logging
   */
  static enableDebug(enabled: boolean): void {
    Logger.debugEnabled = enabled;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] [${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: Error, ...args: any[]): void {
    console.error(`[ERROR] [${this.context}] ${message}`, error ? error.stack : '', ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] [${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (Logger.debugEnabled) {
      console.debug(`[DEBUG] [${this.context}] ${message}`, ...args);
    }
  }
}

export default Logger; 
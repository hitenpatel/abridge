/**
 * Centralized logging utility for API
 * Uses console in development, can be extended for production logging services
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
	[key: string]: unknown;
}

class Logger {
	private isDevelopment = process.env.NODE_ENV === "development";

	private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : "";
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
	}

	info(message: string, context?: LogContext): void {
		console.log(this.formatMessage("info", message, context));
	}

	warn(message: string, context?: LogContext): void {
		console.warn(this.formatMessage("warn", message, context));
	}

	error(message: string, error?: Error | unknown, context?: LogContext): void {
		const errorContext = {
			...context,
			...(error instanceof Error
				? {
						error: error.message,
						stack: this.isDevelopment ? error.stack : undefined,
					}
				: { error }),
		};
		console.error(this.formatMessage("error", message, errorContext));
	}

	debug(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.debug(this.formatMessage("debug", message, context));
		}
	}
}

// Export singleton instance
export const logger = new Logger();

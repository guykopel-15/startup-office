export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

type LogSink = (level: LogLevel, scope: string, message: string, data?: unknown) => void;

const defaultSink: LogSink = (level, scope, message, data): void => {
  const line = `[${scope}] ${message}`;
  const method = level === LogLevel.Debug ? 'debug' : level;
  if (data === undefined) {
    console[method](line);
    return;
  }
  console[method](line, data);
};

let sink: LogSink = defaultSink;

/** Swap the sink in tests or when a file logger arrives. */
export function setLogSink(nextSink: LogSink): void {
  sink = nextSink;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, data): void => sink(LogLevel.Debug, scope, message, data),
    info: (message, data): void => sink(LogLevel.Info, scope, message, data),
    warn: (message, data): void => sink(LogLevel.Warn, scope, message, data),
    error: (message, data): void => sink(LogLevel.Error, scope, message, data),
  };
}

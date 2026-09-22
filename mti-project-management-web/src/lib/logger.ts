// =========================================================================
// MTI Solutions - Real-Time Frontend Operations Logger
// Logs all HTTP, SignalR, Auth, and System events clearly for debugging and monitoring
// =========================================================================

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'signalr';

interface LogEntry {
  timestamp: string;
  category: string;
  message: string;
  data?: any;
  level: LogLevel;
}

class MtiLogger {
  private history: LogEntry[] = [];
  private maxHistory = 100;
  private listeners: ((entry: LogEntry) => void)[] = [];

  private formatTime(): string {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  public log(category: string, message: string, data?: any, level: LogLevel = 'info') {
    const entry: LogEntry = {
      timestamp: this.formatTime(),
      category,
      message,
      data,
      level
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Console output styling
    const prefix = `[${entry.timestamp}] [MTI-${category.toUpperCase()}]`;
    switch (level) {
      case 'success':
        console.log(`%c${prefix} %c${message}`, 'color: #10b981; font-weight: bold;', 'color: #34d399;', data || '');
        break;
      case 'signalr':
        console.log(`%c${prefix} ⚡ %c${message}`, 'color: #38bdf8; font-weight: bold;', 'color: #7dd3fc;', data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data || '');
        break;
      default:
        console.log(`%c${prefix} %c${message}`, 'color: #818cf8; font-weight: bold;', 'color: #c7d2fe;', data || '');
        break;
    }

    this.listeners.forEach((fn) => fn(entry));

    // Send to dev-log endpoint so logs immediately appear in npm run dev terminal
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/dev-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    }
  }

  public http(method: string, url: string, status?: number, durationMs?: number, payload?: any) {
    const isErr = status && status >= 400;
    const msg = `${method.toUpperCase()} ${url} ${status ? `-> [${status}]` : ''} ${durationMs ? `(${durationMs}ms)` : ''}`;
    this.log('HTTP', msg, payload, isErr ? 'error' : 'info');
  }

  public signalr(event: string, payload?: any) {
    this.log('SIGNALR', `Received Event: '${event}'`, payload, 'signalr');
  }

  public info(message: string, data?: any) {
    this.log('SYSTEM', message, data, 'info');
  }

  public success(message: string, data?: any) {
    this.log('SYSTEM', message, data, 'success');
  }

  public warn(message: string, data?: any) {
    this.log('SYSTEM', message, data, 'warn');
  }

  public error(message: string, data?: any) {
    this.log('SYSTEM', message, data, 'error');
  }

  public auth(action: string, data?: any) {
    this.log('AUTH', action, data, 'success');
  }

  public getHistory(): LogEntry[] {
    return [...this.history];
  }

  public subscribe(fn: (entry: LogEntry) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}

export const logger = new MtiLogger();

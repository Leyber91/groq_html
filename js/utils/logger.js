// Simple browser-compatible logger

class Logger {
    constructor() {
        this.logLevel = 'info';
        this.levels = ['error', 'warn', 'info', 'debug'];
    }

    setLogLevel(level) {
        if (this.levels.includes(level)) {
            this.logLevel = level;
        } else {
            console.warn(`Invalid log level: ${level}. Using 'info' as default.`);
        }
    }

    _shouldLog(level) {
        return this.levels.indexOf(level) <= this.levels.indexOf(this.logLevel);
    }

    _log(level, ...args) {
        if (this._shouldLog(level)) {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            console[level](`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
        }
    }

    error(...args) {
        this._log('error', ...args);
    }

    warn(...args) {
        this._log('warn', ...args);
    }

    info(...args) {
        this._log('info', ...args);
    }

    debug(...args) {
        this._log('debug', ...args);
    }
}

const logger = new Logger();

// Set the default log level. This can be adjusted based on your needs.
logger.setLogLevel('info');

export { logger };
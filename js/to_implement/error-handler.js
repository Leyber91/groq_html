export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.loggingService = null;
    }

    setLoggingService(service) {
        this.loggingService = service;
    }

    handleError(error, context = {}) {
        console.error('An error occurred:', error);

        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: context
        };

        this.addToErrorLog(errorEntry);
        this.logErrorToService(errorEntry);
    }

    addToErrorLog(errorEntry) {
        this.errorLog.push(errorEntry);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }

    async logErrorToService(errorEntry) {
        if (this.loggingService) {
            try {
                await this.loggingService.logError(errorEntry);
                console.log('Error successfully logged to service');
            } catch (serviceError) {
                console.error('Failed to log error to service:', serviceError);
            }
        } else {
            console.log('No logging service set. Error details:', errorEntry);
        }
    }

    getErrorLog() {
        return [...this.errorLog];
    }

    clearErrorLog() {
        this.errorLog = [];
    }

    getErrorCount() {
        return this.errorLog.length;
    }

    getLatestError() {
        return this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null;
    }

    filterErrorsByType(errorType) {
        return this.errorLog.filter(error => error.message.includes(errorType));
    }

    summarizeErrors() {
        const summary = {};
        for (const error of this.errorLog) {
            const type = error.message.split(':')[0];
            summary[type] = (summary[type] || 0) + 1;
        }
        return summary;
    }
}
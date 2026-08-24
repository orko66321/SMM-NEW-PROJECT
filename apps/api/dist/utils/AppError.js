export class AppError extends Error {
    statusCode;
    isOperational;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
    static badRequest(message, details) {
        return new AppError(400, message, details);
    }
    static unauthorized(message = "Unauthorized") {
        return new AppError(401, message);
    }
    static forbidden(message = "Forbidden") {
        return new AppError(403, message);
    }
    static notFound(message = "Not found") {
        return new AppError(404, message);
    }
    static conflict(message) {
        return new AppError(409, message);
    }
}

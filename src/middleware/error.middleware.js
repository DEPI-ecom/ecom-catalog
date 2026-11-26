
import { AppError } from "../utils/app-error.js";

export function notFound(req, res, next) {
    next(
        new AppError(
            404,
            `Route not found: ${req.method} ${req.originalUrl}`,
            "ROUTE_NOT_FOUND"
        )
    );
}

export function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    let error = err;

    if (err.code === "P2025") {
        error = new AppError(
            404,
            "Record not found",
            "RECORD_NOT_FOUND"
        );
    }

    if (!(error instanceof AppError)) {
        console.error(error);

        error = new AppError(
            500,
            "Something went wrong",
            "INTERNAL_ERROR"
        );
    }

    res.status(error.statusCode).json({
        error: {
            code: error.code,
            message: error.message,
            details: error.details
        }
    });
}

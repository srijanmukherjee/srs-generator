import { HttpException } from "../exception/http-exception";
import { NextFunction, Request, Response } from "express";

export function handleError(err: Error, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) return next(err);
    const timestamp = new Date().toISOString();
    if (err instanceof HttpException) {
        return res.status(err.status).json({ error: err.messages, timestamp, statusCode: err.status })
    }

    if (process.env.NODE_ENV === 'development') {
        console.error(err);
    }

    const response: { error: string, stacktrace?: string, timestamp: string, statusCode: number } = {
        error: "Something went wrong, please try again later",
        timestamp,
        statusCode: 500
    }

    if (process.env.NODE_ENV === 'development') {
        response.stacktrace = err.stack
    }

    return res.status(500).json(response);
}
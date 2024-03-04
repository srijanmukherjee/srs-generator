import { HttpException } from "./http-exception";

export class BadRequestException extends HttpException {
    constructor(message: string | undefined) {
        super(400, message || "Bad Request")
    }
}
import { HttpException } from "./http-exception";

export class UnprocessableEntityException extends HttpException {
    constructor(message: string | string[]) {
        super(422, message);
    }
}
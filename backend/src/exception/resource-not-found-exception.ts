import { HttpException } from "./http-exception";

export class ResourceNotFoundException extends HttpException {
    constructor(message: string) {
        super(404, message);
    }
}
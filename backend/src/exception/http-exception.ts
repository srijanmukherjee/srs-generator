export class HttpException extends Error {
    status: number;
    messages: string | string[];

    constructor(status: number, message: string | string[]) {
        super("Something went wrong");
        this.messages = message;
        this.status = status;
    }
}
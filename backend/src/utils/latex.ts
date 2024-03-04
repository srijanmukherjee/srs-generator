import { readFile } from "fs/promises";

export class Latex {
    private static AUTHOR_PLACEHOLDER = "AUTHOR";
    private static TITLE_PLACEHOLDER = "TITLE";
    private static BODY_PLACEHOLDER = "PLACEHOLDER";
    private templateFilepath: string;
    private title: string;
    private author: string;
    private body: string;
    private encoding: BufferEncoding;

    constructor(templateFilepath: string, title: string, author: string, encoding: BufferEncoding = 'utf-8') {
        this.templateFilepath = templateFilepath;
        this.title = title;
        this.author = author;
        this.body = "";
        this.encoding = encoding;
    }

    addSection(title: string, content: string) {
        this.body += `\\section{${title}}\n${content}\\\\`
    }

    addSubsection(title: string, content: string) {
        this.body += `\\subsection{${title}}\n${content}\\\\`
    }

    writeLine(content: string) {
        this.body += content + "\\\\";
    }

    replacePlaceholder(str: string, placeholder: string, content: string) {
        return str.replace(`{{ ${placeholder} }}`, content);
    }

    async generate() {
        let data = await readFile(this.templateFilepath, { encoding: this.encoding });
        data = this.replacePlaceholder(data, Latex.AUTHOR_PLACEHOLDER, this.author);
        data = this.replacePlaceholder(data, Latex.TITLE_PLACEHOLDER, this.title);
        data = this.replacePlaceholder(data, Latex.BODY_PLACEHOLDER, this.body);
        return data;
    }
}
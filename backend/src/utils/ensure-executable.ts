import { execSync } from "node:child_process";

/**
 * ensures existence of provided list of executables in the system
 * 
 * @param executables list of executable
 */
export async function ensureExecutables(executables: string[]) {
    for (let executable of executables) {
        try {
            execSync(`type ${executable}`, { stdio: 'ignore' });
        } catch (error: any) {
            if (error.message && error.message.indexOf("command not found") !== -1)
                executable = "type";
            throw new Error(`${executable} command is not found in your system. Make sure it is installed and available in the PATH`);
        }
    }
}
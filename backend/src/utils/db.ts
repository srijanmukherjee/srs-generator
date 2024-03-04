import mongoose from "mongoose";

export async function connectDB(uri: string, dbName: string) {
    if (!uri) {
        throw new Error("Please provide mongo db connection URI.");
    }

    if (!dbName) {
        throw new Error("Please provide the database name.");
    }

    try {
        const conn = await mongoose.connect(uri, { dbName });
        console.log(`connected to database ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
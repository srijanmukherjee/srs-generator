import express from "express";
import dotenv from 'dotenv';
import { connectDB } from "./utils/db";
import { domainRouter } from "./routes/domain";
import { staffRouter } from "./routes/staff";
import { handleError } from "./utils/error-handler";
import { isAsyncFunction } from "util/types";

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.send({
        "status": "ok"
    });
});

app.use("/api/domains", domainRouter);
app.use("/api/staffs", staffRouter);
app.use(handleError);

connectDB(process.env.MONGO_URI!, process.env.MONGO_DATABASE!);
app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});
import { UnprocessableEntityException } from "../exception/unprocessable-entity-exception";
import { Staff } from "../models/staff";
import { Request, Response } from "express";

export async function getStaffs(req: Request, res: Response) {
    const staffs = await Staff.find();
    return res.json(staffs.map((doc) => ({
        name: doc.name,
        abbr: doc.abbreviation,
        hourly_rate: doc.hourly_rate
    })));
}

export async function addStaff(req: Request, res: Response) {
    const { name, hourly_rate, abbr } = req.body;

    if (!name) {
        throw new UnprocessableEntityException("name is missing");
    }

    if (!abbr) {
        throw new UnprocessableEntityException("abbr is missing");
    }

    if (hourly_rate === undefined || hourly_rate === null) {
        throw new UnprocessableEntityException("hourly_rate is missing");
    }

    if (isNaN(hourly_rate) || !Number.isInteger(hourly_rate) || hourly_rate <= 0) {
        throw new UnprocessableEntityException("hourly_rate must be an positive integer");
    }

    try {
        await Staff.create({
            name,
            hourly_rate,
            abbreviation: abbr
        });

        return res.status(200).json({
            status: "ok"
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to save staff."
        });
    }
}

export async function updateStaff(req: Request, res: Response) {
    throw new Error("not implemented");
}
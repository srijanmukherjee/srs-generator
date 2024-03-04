import { Request, Response } from "express";
import { Domain, TFeature } from "../models/domain";
import { z } from "zod";
import { UnprocessableEntityException } from "../exception/unprocessable-entity-exception";
import { ResourceNotFoundException } from "../exception/resource-not-found-exception";
import { BadRequestException } from "../exception/bad-request-exception";
import { Staff, TStaff } from "../models/staff";
import { Latex } from "../utils/latex";
import { v4 as uuidv4 } from "uuid";
import { exec } from "node:child_process";
import { mkdir } from "fs/promises";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const baseFeatureSchema = z.object({
    name: z.string({ required_error: "feature name is required" }),
    description: z.string({ required_error: "feature description is required" }),
    time_estimate: z.number({ required_error: "time_estimate is required" }).min(0, "time estimate must be >= 0"),
    staffs: z.string({ required_error: "staffs is required" }).array(),
    document_content: z.string().optional()
})

type Feature = z.infer<typeof baseFeatureSchema> & {
    features?: Feature[];
};

const featureSchema: z.ZodType<Feature> = baseFeatureSchema.extend({
    features: z.lazy(() => featureSchema.array().nonempty("atleast one feature is required").optional())
});

const domainSchema = z.object({
    name: z.string({ required_error: "domain name is required" }),
    description: z.string({ required_error: "domain requirement is required" }),
    slug: z.string({ required_error: "domain slug is required" }),
    features: z.lazy(() => featureSchema.array().nonempty("atleast one feature is required").optional(), { invalid_type_error: "feature array is invalid", required_error: "feature array is required" })
})

export async function getDomains(req: Request, res: Response) {
    const domains = await Domain.find({}).select({ "name": 1, "slug": 1, "description": 1 });
    return res.json(domains.map((domain) => ({
        name: domain.name,
        slug: domain.slug,
        description: domain.description
    })));
}

function serializeFeatures(features: any) {
    return features.map((feature: any) => ({
        name: feature.name,
        description: feature.description,
        time_estimate: feature.time_estimate,
        staffs: feature.staffs,
        features: serializeFeatures(feature.features),
        id: feature._id.toString()
    }))
}

export async function getDomain(req: Request, res: Response) {
    const { slug } = req.params;

    const domain = await Domain.findOne({ slug }).select('name description slug features -_id').orFail(() => new ResourceNotFoundException("Domain not found"));
    const response = {
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        features: serializeFeatures(domain.features)
    }

    return res.json(response);
}

const ERROR_CODE_DUPLICATE_KEY = 11000;

export async function addDomain(req: Request, res: Response) {
    const domainDto = await domainSchema.parseAsync(req.body).catch((error: z.ZodError) => {
        throw new UnprocessableEntityException(error.issues.map((err) => err.message));
    });

    await Domain.create(domainDto).catch((error) => {
        if (error.name && error.code && error.code === ERROR_CODE_DUPLICATE_KEY)
            throw new BadRequestException("Domain already exists");
        throw error;
    });

    return res.json({ status: "ok" })
}

export async function updateDomain(req: Request, res: Response) {
    const { slug } = req.params;
    const domainDto = await domainSchema.parseAsync(req.body).catch((error: z.ZodError) => {
        throw new UnprocessableEntityException(error.issues.map((err) => err.message));
    });
    console.log(domainDto);
    await Domain.updateOne({ slug }, { $set: domainDto }).orFail(() => new ResourceNotFoundException("Domain not found"));
    return res.json({
        status: "ok"
    })
}

// TODO: refactor this shyte!
interface FeatureMap {
    [key: string]: {
        name: string;
        description: string;
        time_estimate: number;
        staffs: string[],
        features: FeatureMap;
        id: string;
        document_content?: string;
    }
}

function getFeatureMap(features: TFeature[]) {
    return features.reduce((obj, feature) => {
        obj[feature._id.toString()] = { staffs: feature.staffs, time_estimate: feature.time_estimate, features: getFeatureMap(feature.features || []), id: feature._id.toString(), document_content: feature.document_content, name: feature.name, description: feature.description };
        return obj;
    }, {} as any)
}

function computeCost(selections: any[], featureMap: FeatureMap, staffs: { [key: string]: TStaff }) {
    let totalTime = 0;
    let totalCost = 0;
    const staffRequired = new Set<string>();

    selections.forEach((selection) => {
        let time = 0;
        const staffsForFeature = new Set<string>();

        if (typeof selection === "string") {
            const feature = featureMap[selection];
            if (feature === undefined) {
                throw new UnprocessableEntityException(`feature ${selection} doesn't exist`);
            }
            time += feature.time_estimate;
            feature.staffs.forEach((staff) => staffsForFeature.add(staff));
            const subfeature = computeCost(Object.keys(feature.features ?? {}), featureMap[selection].features, staffs);
            subfeature.staffRequired.forEach((staff) => staffRequired.add(staff));
            time += subfeature.time;
        } else if (typeof selection === "object") {
            if (!selection.id || !(typeof selection.id === "string")) {
                throw new UnprocessableEntityException(`expected feature id to be string`);
            }

            if (!featureMap[selection.id]) {
                throw new UnprocessableEntityException(`feature ${selection.id} doesn't exist`);
            }

            time += featureMap[selection.id].time_estimate;
            featureMap[selection.id].staffs.forEach((staff) => staffsForFeature.add(staff));
            if (selection.features !== undefined && !Array.isArray(selection.features)) {
                throw new UnprocessableEntityException("expected features to be an array")
            }

            if (selection.features && Array.isArray(selection.features) && selection.features.length > 0) {
                const subfeature = computeCost(selection.features, featureMap[selection.id].features, staffs);
                subfeature.staffRequired.forEach((staff) => staffsForFeature.add(staff));
                time += subfeature.time;
            } else {
                const subfeature = computeCost(Object.keys(featureMap[selection.id].features ?? {}), featureMap[selection.id].features, staffs);
                subfeature.staffRequired.forEach((staff) => staffRequired.add(staff));
                time += subfeature.time;
            }

        } else {
            throw new UnprocessableEntityException("Expected feature id or an object representing nested features");
        }

        const AVERAGE_HOURLY_RATE = 30;
        const averageStaffCost = Array.from(staffsForFeature.values()).reduce((cost, abbr) => {
            return staffs[abbr] ? staffs[abbr].hourly_rate : AVERAGE_HOURLY_RATE
        }, 0) / staffsForFeature.size;

        totalCost += time * averageStaffCost;
        totalTime += time;
        staffsForFeature.forEach((abbr) => staffRequired.add(abbr));
    });

    return {
        time: totalTime, staffRequired, cost: totalCost
    };
}

// compute estimates based on selected features
export async function getEstimate(req: Request, res: Response) {
    const { slug } = req.params;
    const selections = req.body;
    if (!selections || !Array.isArray(selections)) {
        throw new UnprocessableEntityException("expected an array of feature selections")
    }

    const domain = await Domain.findOne({ slug }).orFail(() => new ResourceNotFoundException("Domain not found"));
    const staffs = (await Staff.find())
        .reduce((obj, staff) => ({ ...obj, [staff.abbreviation]: staff }),
            {} as { [key: string]: TStaff });
    const featureMap = getFeatureMap(domain.features);
    const estimate = computeCost(selections, featureMap, staffs);
    return res.json({ cost: estimate.cost, time: estimate.time, staffs: Array.from(estimate.staffRequired.values()) })
}

function writeFeatures(latex: Latex, selections: any[], featureMap: FeatureMap, staffs: { [key: string]: TStaff }) {
    // get list of staff abbreviations
    const getStaffs = (feature: { features: FeatureMap, staffs: string[] }) => {
        const res = new Set<string>();

        feature.staffs.forEach((str) => {
            res.add(str);
        });

        Object.values(feature.features).forEach((subfeature) => {
            const substaffs = getStaffs(subfeature);
            substaffs.forEach((str) => res.add(str));
        })

        return Array.from(res.values());
    }

    const helper = (selections: any[], featureMap: FeatureMap, staffs: { [key: string]: TStaff }) => {
        selections.forEach((selection) => {
            if (typeof selection === "string") {
                const feature = featureMap[selection];
                if (feature === undefined) {
                    throw new UnprocessableEntityException(`feature ${selection} doesn't exist`);
                }
                latex.addSubsection(feature.name, feature.document_content ?? feature.description);
                helper(Object.keys(feature.features ?? {}), featureMap[selection].features, staffs);
            } else if (typeof selection === "object") {
                if (!selection.id || !(typeof selection.id === "string")) {
                    throw new UnprocessableEntityException(`expected feature id to be string`);
                }

                const feature = featureMap[selection.id];
                if (!feature) {
                    throw new UnprocessableEntityException(`feature ${selection.id} doesn't exist`);
                }

                if (selection.features !== undefined && !Array.isArray(selection.features)) {
                    throw new UnprocessableEntityException("expected features to be an array")
                }

                latex.addSubsection(feature.name, feature.document_content ?? feature.description);

                if (selection.features && Array.isArray(selection.features) && selection.features.length > 0) {
                    helper(selection.features, feature.features, staffs);
                } else {
                    helper(Object.keys(feature.features ?? {}), feature.features, staffs);
                }
            } else {
                throw new UnprocessableEntityException("Expected feature id or an object representing nested features");
            }
        });
    }

    selections.forEach((selection) => {
        if (typeof selection === "string") {
            const feature = featureMap[selection];
            if (feature === undefined) {
                throw new UnprocessableEntityException(`feature ${selection} doesn't exist`);
            }
            const staffRequired = getStaffs(feature).map((abbr) => staffs[abbr].name);
            latex.addSection(feature.name, `Staff Required: ${staffRequired.join(", ")}\\\\${feature.description ?? feature.document_content}`);
            helper(Object.keys(feature.features ?? {}), featureMap[selection].features, staffs);
        } else if (typeof selection === "object") {
            if (!selection.id || !(typeof selection.id === "string")) {
                throw new UnprocessableEntityException(`expected feature id to be string`);
            }

            const feature = featureMap[selection.id];
            if (!feature) {
                throw new UnprocessableEntityException(`feature ${selection.id} doesn't exist`);
            }

            if (selection.features !== undefined && !Array.isArray(selection.features)) {
                throw new UnprocessableEntityException("expected features to be an array")
            }

            const staffRequired = getStaffs(feature).map((abbr) => staffs[abbr].name);
            latex.addSection(feature.name, `Staff Required: ${staffRequired.join(", ")}\\\\${feature.description ?? feature.document_content}`);

            if (selection.features && Array.isArray(selection.features) && selection.features.length > 0) {
                helper(selection.features, feature.features, staffs);
            } else {
                helper(Object.keys(feature.features ?? {}), feature.features, staffs);
            }
        } else {
            throw new UnprocessableEntityException("Expected feature id or an object representing nested features");
        }
    });
}

export async function downloadSRSDocument(req: Request, res: Response) {
    const { slug } = req.params;
    const selections = req.body;
    if (!selections || !Array.isArray(selections)) {
        throw new UnprocessableEntityException("expected an array of feature selections")
    }

    const domain = await Domain.findOne({ slug }).orFail(() => new ResourceNotFoundException("Domain not found"));
    const staffs = (await Staff.find())
        .reduce((obj, staff) => ({ ...obj, [staff.abbreviation]: staff }),
            {} as { [key: string]: TStaff });

    const featureMap = getFeatureMap(domain.features);
    const latex = new Latex("template/srs.tex", `${domain.name} Software Requirement and Specification`, "Company Name");
    latex.writeLine(domain.description);
    writeFeatures(latex, selections, featureMap, staffs);
    const estimate = computeCost(selections, featureMap, staffs);
    latex.addSection("Estimations", `Cost: \\$${estimate.cost}\\\\Duration: ${estimate.time} hours\\\\Staffs: ${Array.from(estimate.staffRequired).map((abbr) => staffs[abbr].name).join(", ")}`)
    const latexSource = await latex.generate();

    const id = uuidv4();
    const OUTPUT_DIR = tmpdir();

    try {
        await mkdir(`${OUTPUT_DIR}/${id}`, { recursive: true });
    } catch (error) {
        await rm(`${OUTPUT_DIR}/${id}`, { force: true, recursive: true });
        throw error;
    }
    try {
        const pdflatexProcess = exec(`pdflatex -halt-on-error -output-directory=${OUTPUT_DIR}/${id}`, async (error, stdout, stderr) => {
            if (error) {
                await rm(`${OUTPUT_DIR}/${id}`, { force: true, recursive: true });
                throw error;
            }

            res.sendFile(`${OUTPUT_DIR}/${id}/texput.pdf`, async (err) => {
                await rm(`${OUTPUT_DIR}/${id}`, { force: true, recursive: true });
                if (err && !res.headersSent) {
                    throw err;
                }
            })
        });

        if (pdflatexProcess.stdin) {
            pdflatexProcess.stdin.write(latexSource);
            pdflatexProcess.stdin.end();
        } else {
            await rm(`${OUTPUT_DIR}/${id}`, { force: true, recursive: true });
            pdflatexProcess.kill();
            throw new Error("subprocess stdin not available");
        }
    } catch (error) {
        await rm(`${OUTPUT_DIR}/${id}`, { force: true, recursive: true });
        throw error;
    }
}
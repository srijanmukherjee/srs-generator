import { Request, Response } from "express";
import { Domain, TFeature } from "../models/domain";
import { z } from "zod";
import { UnprocessableEntityException } from "../exception/unprocessable-entity-exception";
import { ResourceNotFoundException } from "../exception/resource-not-found-exception";
import { BadRequestException } from "../exception/bad-request-exception";
import { Staff, TStaff } from "../models/staff";

const baseFeatureSchema = z.object({
    name: z.string({ required_error: "feature name is required" }),
    description: z.string({ required_error: "feature description is required" }),
    time_estimate: z.number({ required_error: "time_estimate is required" }).min(0, "time estimate must be >= 0"),
    staffs: z.string({ required_error: "staffs is required" }).array(),
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
    }
}

function getFeatureMap(features: TFeature[]) {
    return features.reduce((obj, feature) => {
        obj[feature._id.toString()] = { staffs: feature.staffs, time_estimate: feature.time_estimate, features: getFeatureMap(feature.features || []), id: feature._id.toString() };
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
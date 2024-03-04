import mongoose, { Document } from "mongoose";

export type TFeature = {
    _id: mongoose.Types.ObjectId,
    name: string,
    description: string,
    document_content?: string;
    time_estimate: number,
    staffs: string[],
    features?: TFeature[]
};

interface IFeature extends TFeature, Document {
    _id: mongoose.Types.ObjectId;
}

type TDomain = {
    _id: mongoose.Types.ObjectId,
    name: string,
    description: string,
    slug: string,
    features: TFeature[]
};

interface IDomain extends TDomain, Document {
    _id: mongoose.Types.ObjectId
}

const featureSchema = new mongoose.Schema<IFeature>({
    name: {
        type: String,
        required: true
    },
    description: String,
    time_estimate: {
        type: Number,
        required: true,
    },
    staffs: [String],
    document_content: String
});

featureSchema.add({
    features: [featureSchema]
});

const domainSchema = new mongoose.Schema<IDomain>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        createIndexes: { unique: true }
    },
    features: {
        type: [featureSchema],
        required: true
    }
}, { timestamps: true })

export const Domain = mongoose.model<IDomain>("Domain", domainSchema);
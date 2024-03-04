import mongoose, { Document } from "mongoose"

export type TStaff = {
    _id: mongoose.Types.ObjectId,
    name: string,
    hourly_rate: number,
    abbreviation: string
}

interface IStaff extends TStaff, Document {
    _id: mongoose.Types.ObjectId
}

const staffSchema = new mongoose.Schema<IStaff>({
    name: {
        type: String,
        required: true
    },
    hourly_rate: {
        type: Number,
        required: true
    },
    abbreviation: {
        type: String,
        required: true,
        unique: true,
    }
})

export const Staff = mongoose.model<IStaff>("Staff", staffSchema);
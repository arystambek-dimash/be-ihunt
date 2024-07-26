import mongoose, {Schema, Document, Model} from 'mongoose';

interface IHrUser extends Document {
    profileImage?: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    isVerified?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    isHr: boolean

    comparePassword(candidatePassword: string): Promise<boolean>;
}


const HRUserSchema: Schema<IHrUser> = new mongoose.Schema<IHrUser>(
    {
        profileImage: {type: String},
        firstName: {type: String, required: true},
        lastName: {type: String, required: true},
        email: {
            type: String,
            required: true,
            unique: true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
        },
        password: {type: String},
        isVerified: {type: Boolean, default: false},
        isHr: {type: Boolean, default: true}
    },
    {
        timestamps: true,
    }
);

const HrUserModel: Model<IHrUser> = mongoose.model<IHrUser>('HrUser', HRUserSchema);

export {HrUserModel, IHrUser};
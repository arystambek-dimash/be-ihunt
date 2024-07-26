import mongoose, {Schema, Document, Model} from 'mongoose';

interface IUserCv extends Document {
    userId: string;
    userCv: string;
    embedding: number[];
}

interface IHHUserCV extends Document {
    userId: string;
    userCvId: string;
    embedding: number[];
}

const UserCvSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    userCv: {type: String, required: true},
    embedding: {type: [Number], required: true},
})

const HHUserCv = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    userCvId: {type: String, required: true},
    embedding: {type: [Number], required: true},
})

interface IPosition extends Document {
    position: string;
    status: string;
    date: Date;
}

interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    positions?: IPosition[];
    profileImage: string
    isVerified?: boolean;
    isHr?: boolean;
    linkedinId?: string;
    hasHHAccount?: boolean;
    hhAccessToken?: string;
    hhRefreshToken?: string;

    hasLinkedinAccount?: boolean;
    linkedinAccessToken?: string;
    linkedinRefreshToken?: string;

    only_with_salary?: boolean;

    createdAt?: Date;
    updatedAt?: Date;

    comparePassword(candidatePassword: string): Promise<boolean>;
}

const PositionSchema: Schema<IPosition> = new mongoose.Schema<IPosition>({
    position: {type: String, required: true},
    status: {type: String, default: 'Active'},
    date: {type: Date, required: true, default: Date.now},
});

const UserSchema: Schema<IUser> = new mongoose.Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
        },
        firstName: {type: String, required: true},
        lastName: {type: String, required: true},
        password: {type: String},
        profileImage: {type: String},
        positions: {type: [PositionSchema], default: []},
        hasHHAccount: {type: Boolean, default: false},
        hhAccessToken: {type: String, default: ''},
        hhRefreshToken: {type: String, default: ''},
        hasLinkedinAccount: {type: Boolean, default: false},
        linkedinId: {type: String, default: ''},
        linkedinAccessToken: {type: String, default: ''},
        linkedinRefreshToken: {type: String, default: ''},
        only_with_salary: {type: Boolean, default: false},
        isVerified: {type: Boolean, default: false},
        isHr: {type: Boolean, default: false}
    },
    {
        timestamps: true,
    }
);

const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
const UserCvModel: Model<IUserCv> = mongoose.model<IUserCv>('UserCv', UserSchema);
const HHCvModel: Model<IHHUserCV> = mongoose.model<IHHUserCV>('HHCv', HHUserCv)

export {UserModel, IUser, PositionSchema, IPosition, UserCvModel, IUserCv, HHCvModel, IHHUserCV};

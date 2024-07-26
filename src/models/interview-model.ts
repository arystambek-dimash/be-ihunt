import {Schema, model, Document} from 'mongoose';

interface IMembers extends Document {
    email: string;
    userResume: string;
    isSuitable: boolean;
    summarize: string;
    interviewId: string
}

interface IInterview extends Document {
    userId: string;
    title: string;
    gptPrompt: string;
    questions: string[];
    isActive: boolean,
    createdAt?: Date;
    updatedAt?: Date;
}

const memberSchema = new Schema<IMembers>({
        interviewId: {type: String, required: true},
        email: {type: String, required: true},
        isSuitable: {type: Boolean, required: true, default: false},
        summarize: {type: String},
        userResume: {type: String}
    },
    {timestamps: true}
)

const interviewSchema = new Schema<IInterview>({
    userId: {type: String, required: true},
    title: {type: String, required: true},
    gptPrompt: {type: String, required: false},
    questions: {type: [String], required: false},
    isActive: {type: Boolean, default: true},
}, {timestamps: true});

const InterviewModel = model<IInterview>('Interview', interviewSchema);
const MemberModel = model<IMembers>('Member', memberSchema)
export {IInterview, InterviewModel, IMembers, MemberModel};
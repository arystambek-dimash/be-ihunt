import {Request, Response} from 'express';
import {InterviewModel, MemberModel} from "../models/interview-model";
import {s3} from "../services/aws-service";
import {openai} from "../services/ai-service";
import loadPDF from "../utils";

const INTERVIEW_PROMPT = `
    Ты карьерный консультант (hr), который помогает отбирает людей в работу. 
    Тебе прислали интерьвю ответы и резюме кандиданта и позицию который кандидант проходит и попросили анализировать кандиданта на данную позицию. 
    Пожалуйста, анализируй кандиданта и сделай выводы на языке который позиция написан.
    Напиши в анализе сильные стораны и слабые стораны и обший анализ.
    Используй этот формат для обратной связи:
    {is_suitable_candidate: boolean, reason: string}
    Постарайся уложиться в 30-40 символов или меньше.
`;

const getInterviews = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {page = 1, limit = 10}: any = req.params;

    try {
        const interviews = await InterviewModel.find({userId: user.id})
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean(); // Use lean queries for better performance
        const total = await InterviewModel.countDocuments({userId: user.id});
        return res.status(200).json({interviews, total});
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const getInterviewById = async (req: Request, res: Response) => {
    const interviewId = req.params.interviewId;
    const user = (req as any).user;

    try {
        const interview = await InterviewModel.findOne({userId: user.id, _id: interviewId}).lean();
        if (!interview) {
            return res.status(404).json({message: "Interview not found"});
        }
        return res.status(200).json(interview);
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const analyzeInterview = async (req: Request, res: Response) => {
    const interviewId = req.params.interviewId;
    const userResumeFile = req.file;
    const {answers} = req.body;

    if (!userResumeFile) {
        return res.status(400).json({message: "Invalid resume"});
    }
    if (!answers) {
        return res.status(400).json({message: "Invalid answers"});
    }

    let userResume;
    try {
        const interview = await InterviewModel.findById(interviewId).lean();
        if (!interview) {
            return res.status(404).json({message: "Interview not found"});
        }

        const params = {
            Bucket: "nfactify",
            Key: Date.now().toString() + userResumeFile.originalname,
            Body: userResumeFile.buffer,
            ContentType: userResumeFile.mimetype,
        };

        const data = await s3.upload(params).promise();
        userResume = data.Location;

        const resumeResponse = await loadPDF(userResume);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{role: "system", content: INTERVIEW_PROMPT}, {
                role: "user",
                content: `Резюме кандиданта: ${resumeResponse}\n Ответы кандиданта и вопросы позиции: ${answers}\n Позиция: ${interview.title}`
            }]
        });
        const analysisResult = response.choices[0].message.content;

        return res.status(200).json({analysis: analysisResult});
    } catch (err) {
        console.error("Error in analyzeInterview:", err);
        return res.status(500).json({message: "Something went wrong", error: err});
    }
};

const createInterview = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {title, questions, gptPrompt} = req.body;

    try {
        if (!user.isHr) {
            return res.status(403).json({error: "You are not HR"});
        }
        const newInterview = new InterviewModel({
            userId: user.id,
            title,
            questions,
            gptPrompt
        });
        const savedInterview = await newInterview.save();
        res.status(201).json(savedInterview);
    } catch (error) {
        console.error("Error creating interview:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const addQuestion = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {interviewId} = req.params;
    const {question} = req.body;

    try {
        const updatedInterview = await InterviewModel.findOneAndUpdate(
            {_id: interviewId, userId: user.id},
            {$push: {questions: question}},
            {new: true}
        );
        if (!updatedInterview) {
            return res.status(404).json({message: 'Interview not found'});
        }
        res.status(200).json(updatedInterview);
    } catch (error) {
        console.error("Error adding question:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const updateQuestion = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {interviewId} = req.params;
    const {questionIndex, updatedQuestion} = req.body;

    try {
        const interview = await InterviewModel.findOne({_id: interviewId, userId: user.id});
        if (!interview) {
            return res.status(404).json({message: 'Interview not found'});
        }
        if (questionIndex < 0 || questionIndex >= interview.questions.length) {
            return res.status(400).json({message: 'Invalid question index'});
        }
        interview.questions[questionIndex] = updatedQuestion;
        const updatedInterview = await interview.save();
        res.status(200).json(updatedInterview);
    } catch (error) {
        console.error("Error updating question:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const deleteQuestion = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {interviewId} = req.params;
    const {questionIndex} = req.body;

    try {
        const interview = await InterviewModel.findOne({_id: interviewId, userId: user.id});
        if (!interview) {
            return res.status(404).json({message: 'Interview not found'});
        }
        if (questionIndex < 0 || questionIndex >= interview.questions.length) {
            return res.status(400).json({message: 'Invalid question index'});
        }
        interview.questions.splice(questionIndex, 1);
        const updatedInterview = await interview.save();
        res.status(200).json(updatedInterview);
    } catch (error) {
        console.error("Error deleting question:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const deleteInterview = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {interviewId} = req.params;

    try {
        const deletedInterview = await InterviewModel.findOneAndDelete({_id: interviewId, userId: user.id});
        if (!deletedInterview) {
            return res.status(404).json({message: 'Interview not found'});
        }
        res.status(200).json({message: 'Interview deleted successfully'});
    } catch (error) {
        console.error("Error deleting interview:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const updateInterview = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const {interviewId} = req.params;
    const {title, gptPrompt} = req.body;

    try {
        const updatedInterview = await InterviewModel.findOneAndUpdate(
            {_id: interviewId, userId: user.id},
            {title, gptPrompt},
            {new: true}
        );
        if (!updatedInterview) {
            return res.status(404).json({message: 'Interview not found'});
        }
        res.status(200).json(updatedInterview);
    } catch (error) {
        console.error("Error updating interview:", error);
        return res.status(500).json({message: "Something went wrong"});
    }
};

const getMembersByInterviewID = async (req: Request, res: Response) => {
    const interviewId = req.params.interviewId;
    const user = (req as any).user;

    try {
        const existingInterview = await InterviewModel.findOne({_id: interviewId, userId: user.id}).lean();
        if (!existingInterview) {
            return res.status(404).json({message: "Interview not found or You are not owner"});
        }
        const members = await MemberModel.find({interviewId: interviewId}).lean();
        return res.status(200).json(members);
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Something went wrong"});
    }
};

export {
    getInterviews,
    getInterviewById,
    analyzeInterview,
    createInterview,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    deleteInterview,
    updateInterview,
    getMembersByInterviewID
};

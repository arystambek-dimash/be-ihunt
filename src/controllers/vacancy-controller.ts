import {NextFunction, Request, Response} from "express";
import Vacancy from "../models/vacancies-model";
import {removeMarkdown} from "../utils";
import {openai} from "../services/ai-service";
import OpenAI from "openai";
import ChatCompletion = OpenAI.ChatCompletion;
import HHService from "../services/hh-service";

const hhService = new HHService();

export const inputPositions = async (req: Request, res: Response) => {
    const {position} = req.body;
    const user = (req as any).user;
    try {
        if (!position) {
            return res.status(403).json({error: "Position is empty"});
        }
        user.positions.push({position, status: 'Active', date: new Date()});
        await user.save();
        res.status(200).json({message: "Position added successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const getPositions = async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
        res.status(200).json({positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const deletePosition = async (req: Request, res: Response) => {
    const {positionId} = req.params;
    const user = (req as any).user;
    try {
        user.positions = user.positions.filter((pos: any) => pos._id.toString() !== positionId);
        await user.save();
        res.status(200).json({message: "Position deleted successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const updatePositionStatus = async (req: Request, res: Response) => {
    const {positionId} = req.params;
    const {status} = req.body;
    const user = (req as any).user;
    try {
        const position = user.positions.id(positionId);
        if (!position) {
            return res.status(404).json({error: "Position not found"});
        }
        position.status = status;
        await user.save();
        res.status(200).json({message: "Position status updated successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const getResponses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const {page = 1, limit = 10}: any = req.query;

        const vacancies = await Vacancy.find({user: userId})
            .sort({_id: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Vacancy.countDocuments({user: userId});

        res.status(200).json({
            vacancies,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({message: 'Error retrieving responses', error});
    }
};

// export const searchVacanciesByJobName = async (req: Request, res: Response) => {
//     const {jobName, onlyWithSalary = false} = req.body;
//     const sessionId = req.sessionID;
//
//     try {
//         await cancelPreviousJob(sessionId);
//
//         const job = await searchQueue.add({jobName, onlyWithSalary, sessionId});
//
//         await setJobIdForSession(sessionId, job.id.toString());
//
//         res.status(200).json({message: 'Job added to the queue', jobId: job.id});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({message: 'Something went wrong'});
//     }
// };
//
// export const getJobStatus = async (req: Request, res: Response) => {
//     const {jobId} = req.params;
//
//     try {
//         const job = await searchQueue.getJob(jobId);
//
//         if (!job) {
//             return res.status(404).json({message: 'Job not found'});
//         }
//
//         const jobState = await job.getState();
//         res.status(200).json({jobId, status: jobState});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({message: 'Something went wrong'});
//     }
// };
// export const getPaginatedVacancies = async (req: Request, res: Response) => {
//     const {page = 1, limit = 10} = req.query;
//     const sessionId = req.sessionID;
//
//     if (!sessionId) {
//         return res.status(400).json({message: 'No session ID found'});
//     }
//
//     try {
//         const keys = await redisClient.keys(`vacancies:${sessionId}:*`);
//         console.log(`Found keys for session ${sessionId}:`, keys);
//
//         if (keys.length === 0) {
//             return res.status(404).json({message: 'No vacancies found for this session'});
//         }
//
//         const allVacancies = [];
//         for (const key of keys) {
//             const vacanciesData = await redisClient.get(key);
//             console.log(`Retrieved data for key ${key}:`, vacanciesData);
//
//             if (vacanciesData) {
//                 try {
//                     const parsedData = JSON.parse(vacanciesData);
//                     allVacancies.push(...(parsedData.recommendations || []));
//                 } catch (parseError) {
//                     console.error(`Error parsing data for key ${key}:`, parseError);
//                 }
//             }
//         }
//
//         const startIndex = (Number(page) - 1) * Number(limit);
//         const endIndex = Number(page) * Number(limit);
//         const paginatedVacancies = allVacancies.slice(startIndex, endIndex);
//
//         res.status(200).json({vacancies: paginatedVacancies, total: allVacancies.length});
//     } catch (error) {
//         console.error('Error in getPaginatedVacancies:', error);
//         res.status(500).json({message: 'Something went wrong'});
//     }
// };
// export const endSessionHandler = (req: Request, res: Response, next: NextFunction) => {
//     req.session.destroy(err => {
//         if (err) {
//             console.error('Failed to destroy session:', err);
//         } else {
//             redisClient.keys(`vacancies:${req.sessionID}:*`).then(keys => {
//                 keys.forEach(key => redisClient.del(key));
//             });
//         }
//         next();
//     });
// };


export const searchVacanciesByJobName = async (req: Request, res: Response) => {
    const {jobName, onlyWithSalary = false}: { jobName: string; onlyWithSalary: boolean } = req.body;

    try {
        const extractPosition = await extractPositionFromJobName(jobName);
        const vacancies = await fetchAndAnalyzeVacancies(extractPosition, jobName, onlyWithSalary);
        return res.status(200).json({vacancies: vacancies});
    } catch (err) {
        console.error('Error in searchVacanciesByJobName:', err);
        return res.status(500).json({message: "Something went wrong"});
    }
};

async function extractPositionFromJobName(jobName: string): Promise<string> {
    const PROMPT = `
        Extract the position from the following job name without levels. Only return the position.
        Job name: ${jobName}
        
        Use this format to return:
        {"position": "string"}
    `;

    const completion = await openai.chat.completions.create({
        messages: [{role: 'user', content: PROMPT}],
        model: 'gpt-3.5-turbo',
        temperature: 0.3
    });

    const responseText = completion.choices[0].message.content;
    const {position} = JSON.parse(responseText);
    return position;
}

async function fetchAndAnalyzeVacancies(extractPosition: string, jobName: string, onlyWithSalary: boolean): Promise<any[]> {
    const vacancies = [];

    for (let page = 1; page <= 100; page++) {
        const vacanciesPage = await hhService.getVacancy(extractPosition, {
            page,
            text: extractPosition,
            only_with_salary: onlyWithSalary,
            per_page: 10
        });
        if (vacanciesPage.items.length === 0) break;
        const vacancyDetailsArr = vacanciesPage.items.map(formatVacancyDetails);
        const recommendations = await analyzeVacancies(jobName, vacancyDetailsArr);
        for (const recommendation of recommendations) {
            try {
                const vacancy = await hhService.getVacancyById(recommendation.vacancyId);
                vacancies.push(vacancy);
            } catch (vacancyError) {
                console.error(`Error fetching vacancy ID ${recommendation.vacancyId}:`, vacancyError);
            }
        }
    }
    return vacancies;
}

function formatVacancyDetails(vacancy: any): string {
    return `
Vacancy Id: ${vacancy.id}
Vacancy Title: ${vacancy.name}
Vacancy Responsibility: ${vacancy.snippet.responsibility || 'N/A'}
Vacancy Requirements: ${vacancy.snippet.requirement || 'N/A'}
Salary: ${vacancy.salary?.from || 'N/A'} to ${vacancy.salary?.to || 'N/A'} ${vacancy.salary?.currency || ''}
    `.trim();
}

async function analyzeVacancies(jobName: string, vacancyDetailsArr: string[]): Promise<{ vacancyId: string }[]> {
    const PROMPT = `
Analyze vacancy details and determine if the vacancy is suitable for the user's request. Only get suitable vacancies for user request. And if in 
job will request about user request too get it

User's requested position: ${jobName} 

Vacancy Details:
${vacancyDetailsArr.join("\n\n")}
Return in this format(And return without any extra words):
{
    "recommendations": [
        {
            "vacancyId": string
        }
        // ... (repeat for all)
    ]
}`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{role: "user", content: PROMPT}],
        n: 1,
        temperature: 0.7,
    });
    const cleanedResponse = removeMarkdown(response.choices[0].message.content.trim());
    const {recommendations} = JSON.parse(cleanedResponse);
    return recommendations;
}
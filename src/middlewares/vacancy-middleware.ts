// import {NextFunction, Request, Response} from "express";
// import {redisClient} from "../services/job-queue-service";
//
// export const checkForExistingVacancies = async (req: Request, res: Response, next: NextFunction) => {
//     const {jobName} = req.body;
//     const sessionId = req.sessionID;
//
//     const existingVacancies = await redisClient.get(`vacancies:${sessionId}:${jobName}`);
//     if (existingVacancies) {
//         return res.status(200).json({vacancies: JSON.parse(existingVacancies)});
//     }
//
//     next();
// };

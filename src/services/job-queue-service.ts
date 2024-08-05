// import Queue from 'bull';
// import Redis from 'ioredis';
// import {openai} from './ai-service';
// import HHService from './hh-service';
// import {removeMarkdown} from "../utils";
//
// const redisConfig = {
//     host: '127.0.0.1',
//     port: 6379,
// };
//
// const redisClient = new Redis(redisConfig);
//
// // Check Redis connection
// redisClient.on('connect', () => {
//     console.log('Connected to Redis');
// });
//
// redisClient.on('error', (err) => {
//     console.error('Redis connection error:', err);
// });
//
// const searchQueue = new Queue('searchQueue', {redis: redisConfig});
// const hhService = new HHService();
//
// export const extractPositionFromJobName = async (jobName: string): Promise<string> => {
//     const PROMPT: string = `
//   Я буду давать тебе positions как это (это просто экзампл) Python developer с зарплатой меньше 350000тг и ты должен извелечь
//   позицию как (это просто экзампл) Python developer
//
//   и еще постоянно извелечь ключевой слово это нужно для поиска по вакансям как это просто экзампл Javascript разработчик или т.д
//   и извелечь без уровней только позицию
//
//   user wanted position text: ${jobName}
//
//   {"position" : "string"}
// `;
//     const completion = await openai.chat.completions.create({
//         messages: [{role: 'user', content: PROMPT}],
//         model: 'gpt-3.5-turbo',
//         temperature: 0.3,
//     });
//
//     const responseText: string = completion.choices[0].message.content;
//     const responseJson = JSON.parse(responseText);
//     console.log(responseJson)
//     return responseJson.position;
// };
//
// export const analyzeVacancies = async (jobName: string, vacancyDetailsArr: string[]): Promise<any> => {
//     const PROMPT = `
//   Analyze vacancy details and determine if the vacancy is suitable for the user's request.
//   User's requested position: ${jobName}
//   Vacancy Details:
//   ${vacancyDetailsArr.join('\n\n')}
//   Return in this format:
//   {
//       "recommendations": [
//           {
//               "isSuitable": boolean,
//               "vacancyId": string
//           }
//           // ... (repeat for all)
//       ]
//   }`;
//
//     const response = await openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [{role: 'user', content: PROMPT}],
//         n: 1,
//         temperature: 0.3,
//     });
//
//     const cleanedResponse = removeMarkdown(response.choices[0].message.content.trim());
//
//     return JSON.parse(cleanedResponse);
// };
//
// export const getVacancies = async (position: string, onlyWithSalary: boolean): Promise<any[]> => {
//     let vacancies: any[] = [];
//
//     for (let page = 1; page <= 100; page++) {
//         const vacanciesPage = await hhService.getVacancy(position, {
//             page,
//             text: position,
//             only_with_salary: onlyWithSalary,
//         });
//
//         if (vacanciesPage.items.length === 0) {
//             break;
//         }
//
//         vacancies = vacancies.concat(vacanciesPage.items);
//     }
//
//     return vacancies;
// };
//
// searchQueue.process(async (job, done) => {
//     const {jobName, onlyWithSalary, sessionId} = job.data;
//
//     try {
//         const position = await extractPositionFromJobName(jobName);
//         const vacancies = await getVacancies(position, onlyWithSalary);
//         const vacancyDetailsArr = vacancies.map((vacancy) => `
// Vacancy Id: ${vacancy.id}
// Vacancy Title: ${vacancy.name}
// Vacancy Responsibility: ${vacancy.snippet.responsibility || 'N/A'}
// Vacancy Requirements: ${vacancy.snippet.requirement || 'N/A'}
// Salary: ${vacancy.salary?.from || 'N/A'} to ${vacancy.salary?.to || 'N/A'} ${vacancy.salary?.currency || ''}
//     `.trim());
//
//         const recommendations = await analyzeVacancies(jobName, vacancyDetailsArr);
//
//         await redisClient.set(`vacancies:${sessionId}:${jobName}`, JSON.stringify(recommendations), 'EX', 3600);
//         console.log(`Set key: vacancies:${sessionId}:${jobName}`);
//
//         done(null, recommendations);
//     } catch (error: any) {
//         console.error('Job processing failed:', error);
//         done(new Error('Job processing failed'));
//     }
// });
//
// export const cancelPreviousJob = async (sessionId: string) => {
//     const previousJobId = await redisClient.get(`job:${sessionId}`);
//     if (previousJobId) {
//         const job = await searchQueue.getJob(previousJobId);
//         if (job) {
//             await job.remove();
//             console.log(`Removed previous job: ${previousJobId}`);
//         }
//     }
// };
//
// export const setJobIdForSession = async (sessionId: string, jobId: string) => {
//     await redisClient.set(`job:${sessionId}`, jobId, 'EX', 3600);
//     console.log(`Set job ID for session ${sessionId}: ${jobId}`);
// };
//
// export {redisClient, searchQueue};

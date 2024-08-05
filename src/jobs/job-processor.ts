// import Redis from 'ioredis';
// import {analyzeVacancies, extractPositionFromJobName, getVacancies, searchQueue} from "../services/job-queue-service";
//
// const redisConfig = {
//     host: '127.0.0.1',
//     port: 6379,
// };
//
// searchQueue.process(async (job, done) => {
//     const {jobName, onlyWithSalary, sessionId} = job.data;
//
//     try {
//         const position = await extractPositionFromJobName(jobName);
//         const vacancies = await getVacancies(position, onlyWithSalary);
//         const vacancyDetailsArr = vacancies.map(vacancy => `
// Vacancy Id: ${vacancy.id}
// Vacancy Title: ${vacancy.name}
// Vacancy Responsibility: ${vacancy.snippet?.responsibility || 'N/A'}
// Vacancy Requirements: ${vacancy.snippet?.requirement || 'N/A'}
// Salary: ${vacancy.salary?.from || 'N/A'} to ${vacancy.salary?.to || 'N/A'} ${vacancy.salary?.currency || ''}
// `.trim());
//
//         const recommendations = await analyzeVacancies(jobName, vacancyDetailsArr);
//
//         const redisClient = new Redis(redisConfig);
//         await redisClient.set(`vacancies:${sessionId}`, JSON.stringify(recommendations), 'EX', 3600);
//         await redisClient.quit();
//
//         done(null, recommendations);
//     } catch (error) {
//         console.error('Error processing job:', error);
//         done(error);
//     }
// });
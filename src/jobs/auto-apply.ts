import {CronJob} from 'cron';
import {UserCvModel, UserModel} from "../models/user-model";
import HHService from "../services/hh-service";
import VacanciesModel from "../models/vacancies-model";
import {geminiModel, openai} from "../services/ai-service";
import {queue} from 'async';

const hhService = new HHService();
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getApplicationsPerPosition = (numPositions: number) => {
    if (numPositions <= 4) return 7;
    if (numPositions >= 8) return 2;
    return 6;
};

const generateCoverLetter = async (user: any, vacancy: any, resume: any = undefined) => {
    const COVER_LETTER_PROMPT = `
    Твоя задача — создать профессиональное сопроводительное письмо.
    
    Адресуйте письмо следующему указанную должность:
    Должность: ${vacancy.name}

    Опишите, как ваше образование, опыт работы, навыки и мотивация соответствуют требованиям и задачам должности. Используйте следующую информацию:
    Требования: ${vacancy.snippet.requirement}
    Задачи: ${vacancy.snippet.responsibility}

    Пишите в профессиональном, лаконичном и сжатом тоне. Сопроводительное письмо должно быть на языке вакансии. Не добавляйте лишние пробелы или символы.
    
    Имя: ${user.firstName}
    Фамилия: ${user.lastName}
    Резюме: ${resume ? resume.join('') : ''}
    
    Пример сопроводительного письма:
    
    Здравствуйте, Я пишу, чтобы выразить свою заинтересованность в должности ${vacancy.name} в компании ${vacancy.employer.name}. 
    Уверен, что мои навыки и опыт делают меня сильным кандидатом на эту роль. Благодаря проактивному подходу, исключительной 
    трудовой этике и решимости превосходить цели, я уверен в своей способности успешно выполнять обязанности данной должности.
    У меня более [время(если есть если нет не надо врать)] опыта в [соответствующей области/должности]. В моей предыдущей роли в [предыдущий работодатель] я 
    [кратко опишите ключевые достижения и обязанности, связанные с работой].
    Кроме того, у меня есть опыт работы с [соответствующее программное обеспечение/инструменты/навыки].
    Я с нетерпением жду возможности обсудить, как мой опыт, навыки и энтузиазм могут способствовать успеху.
    Спасибо за рассмотрение моей заявки. Надеюсь на возможность обсудить мои квалификации подробнее.

    Попробуйте писать 50-60 слов и всегда начинай на Здравствуйте. 
`;

    const completion = await openai.chat.completions.create({
        messages: [{role: "user", content: COVER_LETTER_PROMPT}],
        model: "gpt-4o-mini"
    });

    return completion.choices[0].message.content;
};

const isSuitableVacancy = async (position: string, vacancy: any) => {
    const vacancyDetails = `
        Vacancy Title: ${vacancy.name}, Vacancy Responsibility: ${vacancy.snippet.responsibility}, Vacancy Requirements: ${vacancy.snippet.requirement}.
        Salary: ${vacancy.salary?.from} to ${vacancy.salary?.to} ${vacancy.salary?.currency}.
    `;
    const PROMPT = `Analyze vacancy to suitable or not for user request. 
        User request position: ${position} \n Vacancy Details: ${vacancyDetails} \n
        Return in this format:
        {
          isSuitable: boolean,
          reason: string
        } 
        WARNING Vacancy should suitable on 80-100% if not stack which user input is not suitable`;
    const response = await geminiModel.generateContent(PROMPT);
    const responseText = response.response.text();
    const sanitizedResponseText = responseText.replace(/(\w+):/g, '"$1":');

    const jsonMatch = sanitizedResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("Failed to extract JSON object from response text.");
        return {isSuitable: false, reason: "Invalid response format"};
    }
    let jsonResponse;
    try {
        jsonResponse = JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Failed to parse extracted JSON object:", error);
        return {isSuitable: false, reason: "Failed to parse JSON"};
    }
    return jsonResponse.isSuitable;
};

const processVacancies = async (user: any, position: any) => {
    const applicationsPerPosition = getApplicationsPerPosition(user.positions.length);
    const vacancyDocs: any = [];
    let processedVacancies = 0;

    for (let page = 1; page <= 6; page++) {
        const vacanciesPage = await hhService.getVacancy(position.position, {
            page,
            text: position.position,
            only_with_salary: user.only_with_salary
        });

        const promises = vacanciesPage.items.map(async (vacancy: any) => {
            if (processedVacancies >= applicationsPerPosition) return;

            const alreadyInVacancyDocs = vacancyDocs.some((doc: any) => doc.vacancy_id === vacancy.id);
            if (alreadyInVacancyDocs) return;

            const alreadyExistingVacancy = await VacanciesModel.findOne({job_name: vacancy.name});
            if (alreadyExistingVacancy) return;

            const isSuitable = await isSuitableVacancy(position.position, vacancy);
            if (!isSuitable) return;

            let coverLetter;
            if (user.hasHHAccount) {
                const resumeId = await hhService.getSuitableResumeId(vacancy.id, user.hhAccessToken);
                const resumeDetail = await hhService.getOneResume(resumeId, user.hhAccessToken);
                coverLetter = await generateCoverLetter(user, vacancy, resumeDetail);
                await hhService.sendNegotiation(vacancy.id, resumeId, coverLetter as string, user.hhAccessToken);
            } else {
                coverLetter = await generateCoverLetter(user, vacancy);
            }

            vacancyDocs.push({
                vacancy_id: vacancy.id,
                job_name: vacancy.name,
                employer_name: vacancy.employer.name,
                salary: vacancy.salary ? vacancy.salary.from : 0,
                employer_logo: vacancy.employer.logo_urls ? vacancy.employer.logo_urls['90'] : 'https://media.licdn.com/dms/image/C4D0BAQGYJfURzon1xg/company-logo_200_200/0/1631327285447?e=2147483647&v=beta&t=mTBfWh3AsArQHLJLo8fp6OLk5LLlzqQrsL6ob3uUFsA',
                responsibility: vacancy.snippet.responsibility || '',
                requirement: vacancy.snippet.requirement || '',
                address: vacancy.address ? vacancy.address.raw : '',
                url: `https://hh.kz/vacancy/${vacancy.id}/`,
                user: user._id,
                cover_letter: coverLetter,
                isHeadHunterVacancy: true,
                isOtherSiteVacancy: false,
            });
            processedVacancies++;
        });

        await Promise.allSettled(promises);

        if (processedVacancies >= applicationsPerPosition) break;
        await delay(2500);
    }

    try {
        await VacanciesModel.insertMany(vacancyDocs, {ordered: false});
    } catch (error) {
        console.error("Error inserting vacancies:", error);
    }
};

const processUsers = async (users: any[]) => {
    const q = queue(async (user: any, callback) => {
        const positionPromises = user.positions.map(async (position: any) => {
            if (position.position && position.status === 'Active') {
                await processVacancies(user, position);
            }
        });
        await Promise.allSettled(positionPromises);
        callback();
    }, 10); // Limit concurrent user processing to 10

    users.forEach((user: any) => q.push(user));
    await q.drain();
};

const autoApply = async () => {
    try {
        console.log("Task started");
        const users: any = await UserModel.find({}).lean();
        await processUsers(users);
        console.log("Task ended");
    } catch (error) {
        console.error('Error during auto apply process:', error);
    }
};

const morningJob = new CronJob('0 */5 * * *', autoApply, null, true, 'Asia/Qyzylorda');

export {morningJob};

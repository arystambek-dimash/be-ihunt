import {CronJob} from 'cron';
import {UserModel} from '../models/user-model';
import HHService from '../services/hh-service';
import VacanciesModel from '../models/vacancies-model';
import {openai} from '../services/ai-service';
import {queue} from 'async';
import loadPDF from "../utils";

const hhService = new HHService();

const getApplicationsPerPosition = (numPositions: number): number => {
    if (numPositions <= 4) return 7;
    if (numPositions >= 8) return 2;
    return 6;
};

const generateCoverLetter = async (user: any, vacancy: any, resume: any = '') => {
    let COVER_LETTER_PROMPT = '';
    try {
        COVER_LETTER_PROMPT = `
    Твоя задача — создать профессиональное сопроводительное письмо.
    Адресуйте письмо следующему указанную должность:
    Должность: ${vacancy.name}
    Опишите, как ваше образование, опыт работы, навыки и мотивация соответствуют требованиям и задачам должности. Используйте следующую информацию:
    Требования: ${vacancy.snippet.requirement}
    Задачи: ${vacancy.snippet.responsibility}
    Пишите в профессиональном, лаконичном и сжатом тоне. Сопроводительное письмо должно быть на языке вакансии. Не добавляйте лишние пробелы или символы.
    Имя: ${user.firstName}
    Фамилия: ${user.lastName}
    Резюме: ${resume}
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
    
    
    И Важно если у меня в резюме нет подходящего навыка или опыта работы или я сам тебе не сказал не пиши про это. Пиший правильный нормальный сопровождательный письмо 
    Никого не обманывай
  `;
    } catch (err) {
        console.log(err)
    }
    try {
        const completion = await openai.chat.completions.create({
            messages: [{role: 'user', content: COVER_LETTER_PROMPT}],
            model: 'gpt-4o-mini',
            temperature: 0.3
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating cover letter:', error);
        return null;
    }
};

const isSuitableVacancy = async (position: string, vacancy: any): Promise<boolean> => {
    const vacancyDetails = `
    Vacancy Title: ${vacancy.name}, Vacancy Responsibility: ${vacancy.snippet.responsibility}, Vacancy Requirements: ${vacancy.snippet.requirement}.
    Salary: ${vacancy.salary?.from} to ${vacancy.salary?.to} ${vacancy.salary?.currency}.
  `;
    const PROMPT = `Analyze if the vacancy is suitable for the user's request. 
    User's requested position: ${position} \n Vacancy Details: ${vacancyDetails} \n
    Return in this format: 
{
"isSuitable": boolean,
"reason": "string"
}
    This format is required
    WARNING: Vacancy should be max suitable and if not suitable is suitable is false`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{role: 'user', content: PROMPT}],
            model: 'gpt-4o-mini',
            temperature: 0.3
        });

        const responseText: any = completion.choices[0].message.content;
        const responseJson = JSON.parse(responseText);
        return responseJson.isSuitable;
    } catch (error) {
        console.error('Error determining if vacancy is suitable:', error);
        return false;
    }
};

const processVacancies = async (user: any, position: { position: string; status: string }) => {
    if (!user.positions) return;

    const applicationsPerPosition = getApplicationsPerPosition(user.positions.length);
    const vacancyDocs: any[] = [];
    let processedVacancies = 0;

    for (let page = 1; page <= 6; page++) {
        const PROMPT = `
        Я буду давать тебе positions как это (это просто экзампл) Python developer с зарплатой меньше 350000тг и ты должен извелечь
        позицию как (это просто экзампл) Python developer
        
        и еще постоянно извелечь ключевой слово это нужно для поиска по вакансям как это просто экзампл Javascript разработчик или т.д
        и извелечь без уровней только позицию
        
        user wanted position text: ${position.position} 
        
        {"position" : "string"}
      `;
        try {
            const completion = await openai.chat.completions.create({
                messages: [{role: 'user', content: PROMPT}],
                model: 'gpt-3.5-turbo',
                temperature: 0.3
            });
            const responseText: any = completion.choices[0].message.content;
            const responseJson = JSON.parse(responseText);
            const extractPosition = responseJson.position;
            const vacanciesPage = await hhService.getVacancy(extractPosition, {
                page,
                text: extractPosition,
                only_with_salary: user.only_with_salary,
            });

            if (vacanciesPage.items.length === 0) {
                continue;
            }
            const promises = vacanciesPage.items.map(async (vacancy: any) => {
                if (processedVacancies >= applicationsPerPosition) {
                    return;
                }
                const alreadyInVacancyDocs = vacancyDocs.some((doc: any) => doc.vacancy_id === vacancy.id || (doc.job_name === vacancy.name && doc.employer_name === vacancy.employer.name));
                if (alreadyInVacancyDocs) {
                    return;
                }
                const alreadyExistingVacancy = await VacanciesModel.findOne({job_name: vacancy.name});
                if (alreadyExistingVacancy) {
                    return;
                }
                const isSuitable = await isSuitableVacancy(position.position, vacancy);
                if (!isSuitable) return;

                let coverLetter: any;
                if (user.hasHHAccount) {
                    const resumeId = await hhService.getSuitableResumeId(vacancy.id, user.hhAccessToken as string);
                    const resumeDetail = await hhService.getOneResume(resumeId, user.hhAccessToken as string);
                    const pdfContent = await loadPDF(resumeDetail.download.pdf.url, user.hhAccessToken);
                    coverLetter = await generateCoverLetter(user, vacancy, pdfContent);
                    await hhService.sendNegotiation(vacancy.id, resumeId, coverLetter, user.hhAccessToken as string);
                } else {
                    coverLetter = await generateCoverLetter(user, vacancy);
                    if (!coverLetter) {
                        return;
                    }
                }

                const vacancyDoc = {
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
                };
                vacancyDocs.push(vacancyDoc);
                processedVacancies++;
            });

            await Promise.allSettled(promises);

            if (processedVacancies >= applicationsPerPosition) break;
        } catch (error) {
            console.error('Error processing vacancies for page', page, error);
        }
    }

    if (vacancyDocs.length > 0) {
        try {
            // Insert vacancyDocs into the database with additional checks
            await VacanciesModel.insertMany(vacancyDocs, {ordered: false});
            console.log('Vacancies inserted successfully');
        } catch (error) {
            console.error('Error inserting vacancies:', error);
        }
    } else {
        console.log('No vacancies to insert');
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
    }, 10);

    users.forEach(user => q.push(user));
    await q.drain();
};

const autoApply = async () => {
    try {
        console.log('Task started');
        const users: any[] = await UserModel.find({}).lean();
        await processUsers(users);
        console.log('Task ended');
    } catch (error) {
        console.error('Error during auto apply process:', error);
    }
};

const job1 = new CronJob('0 10 * * *', autoApply, null, true, 'Asia/Qyzylorda');

// Schedule the job to run at 3:00 PM
const job2 = new CronJob('0 15 * * *', autoApply, null, true, 'Asia/Qyzylorda');

// Schedule the job to run at 6:00 PM
const job3 = new CronJob('0 18 * * *', autoApply, null, true, 'Asia/Qyzylorda');

// Schedule the job to run at 11:59 PM
const job4 = new CronJob('59 23 * * *', autoApply, null, true, 'Asia/Qyzylorda');

export {job1, job2, job3, job4};
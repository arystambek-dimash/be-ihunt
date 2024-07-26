import conf from "../config/conf";
import axios from "axios";
import {openai} from "./ai-service";
import loadPDF from "../utils";

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

class HHService {
    authorization = async (code: string): Promise<any> => {
        try {
            const URL = 'https://hh.ru/oauth/token';
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: conf.hhClientId || '',
                client_secret: conf.hhClientSecret || '',
                code: code
            });
            const response = await axios.post(URL, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            return this.extractTokens(response);
        } catch (err) {
            console.error("Failed to sign in");
        }
    }
    sendNegotiation = async (vacancyId: string, resumeId: string, message: string, token: string): Promise<any> => {
        try {
            const URL = 'https://api.hh.ru/negotiations';
            const formData = new FormData();
            formData.append('vacancy_id', vacancyId);
            formData.append('resume_id', resumeId);
            if (message) {
                formData.append('message', message);
            }

            const response = await axios.post(URL, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                    'HH-User-Agent': 'Recruiter AI/1.0 (arystambekdimash005@gmail.com)'
                }
            });

            return response.data;
        } catch (err) {
            throw err;
        }
    }
    getVacancy = async (vacancyName: any, paramsObj: any) => {
        try {
            const URL = 'https://api.hh.ru/vacancies';
            const today = new Date();

            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(today.getDate() - 2);

            paramsObj.date_from = twoDaysAgo.toISOString().split('T')[0];
            paramsObj.order_by = 'publication_time';
            paramsObj.text = vacancyName;
            paramsObj.area = 40

            const params = new URLSearchParams(paramsObj);

            const response = await axios.get(`${URL}?${params.toString()}`);
            return response.data;
        } catch (err: any) {
            if (err.response) {
                console.error("Response data:", err.response.data);
                console.error("Response status:", err.response.status);
                console.error("Response headers:", err.response.headers);
            } else {
                console.error("Error message:", err.message);
            }
            throw err;
        }
    }
    getSuitableResumeId = async (vacancyId: string, token: string): Promise<any> => {
        try {
            const resumesURL = `https://api.hh.ru/vacancies/${vacancyId}/suitable_resumes`;
            const vacancyURL = `https://api.hh.ru/vacancies/${vacancyId}`;

            const resumeResponse = await axios.get(resumesURL, {
                headers: this.getHeaders(token)
            });
            const vacancyResponse = await axios.get(vacancyURL, {
                headers: this.getHeaders(token)
            });

            const resumes = resumeResponse.data.items.slice(0, 4);
            const vacancy = vacancyResponse.data;

            const resumeDetails = await Promise.all(resumes.map(async (resume: any) => {
                const pdfContent = await loadPDF(resume.download.pdf.url, token);
                return {
                    id: resume.id,
                    data: pdfContent
                };
            }));

            const vacancyDetails = `
            Vacancy for ${vacancy.name}, located in ${vacancy.area.name}.
            Salary: ${vacancy.salary?.from} to ${vacancy.salary?.to} ${vacancy.salary?.currency}.
            Employment type: ${vacancy.employment.name}, Schedule: ${vacancy.schedule.name}.
            Key skills required: ${vacancy.key_skills.map((skill: any) => skill.name).join(', ')}.
        `;

            const PROMPT = `
            Get the most suitable resume id. WARNING : If there is no suitable resume id, then get any existing resume id.
            Resumes:
            ${resumeDetails.map((resume: any) => `
                Resume ID: ${resume.id}
                Resume data: ${resume.data}
            `).join('\n')}
            
            Vacancy:
            ${vacancyDetails}
            
            Return in this format:
            {
                "resumeId": "string" | null
            }
        `;
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{role: "user", content: PROMPT}],
                temperature: 0.3
            });

            const jsonResponse = completion.choices[0].message.content as string;
            console.log(jsonResponse);

            const regex = /"resumeId": "([^"]+)"/;
            const match = jsonResponse.match(regex);

            if (match && match[1]) {
                return match[1];
            } else {
                const response = await axios.get('https://api.hh.ru/resumes/mine', {
                    headers: this.getHeaders(token)
                });
                return response.data.items[0].id;
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    console.error('Response data:', err.response.data);
                    console.error('Status code:', err.response.status);
                    console.error('Headers:', err.response.headers);
                } else if (err.request) {
                    console.error('Request data:', err.request);
                } else {
                    console.error('Error message:', err.message);
                }
            } else {
                console.error('Unexpected error:', err);
            }
        }
    }
    getOneResume = async (resumeId: string, token: string) => {
        const URL = `https://api.hh.ru/resumes/${resumeId}`
        const response = await axios.get(`${URL}`, {
            headers: this.getHeaders(token)
        });
        return response.data;

    }

    extractTokens(response: any): TokenResponse {
        return {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            expires_in: response.data.expires_in
        };
    }

    getHeaders(token: string): { [key: string]: string } {
        return {
            'Authorization': `Bearer ${token}`,
            'HH-User-Agent': 'Recruiter AI/1.0 (arystambekdimash005@gmail.com)'
        };
    }
}


// (async () => {
//     const hhService = new HHService();
//     await hhService.getOneResume('31f5fff1ff0d50966c0039ed1f306c656d7674', 'USERTVG211KSON76B75JMCBL3M0RCNP0TKJKI0NMTKK5EE5ISJCTBKOLDTS329L6')
// })();
export default HHService;
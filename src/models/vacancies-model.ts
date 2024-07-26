import mongoose, {Schema, Document} from 'mongoose';

export interface IVacancy extends Document {
    vacancy_id: string;
    job_name: string;
    employer_name: string;
    salary: number;
    employer_logo: string;
    responsibility: string;
    requirement: string;
    address: string;
    url: string;
    user: string;
    cover_letter: string;
    isHeadHunterVacancy: boolean;
    isOtherSiteVacancy: boolean;
}

const VacancySchema: Schema = new Schema({
    vacancy_id: {type: String, required: true},
    job_name: {type: String, required: true},
    employer_name: {type: String, required: true},
    salary: {type: Number},
    employer_logo: {type: String},
    responsibility: {type: String},
    requirement: {type: String, required: true},
    address: {type: String},
    url: {type: String, required: true},
    user: {type: String, ref: 'User', required: true},
    cover_letter: {type: String, required: true},
    isHeadHunterVacancy: {type: Boolean, default: false},
    isOtherSiteVacancy: {type: Boolean, default: false}
});

const Vacancy = mongoose.model<IVacancy>('Vacancy', VacancySchema);

export default Vacancy;

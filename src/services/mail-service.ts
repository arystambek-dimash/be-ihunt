import nodemailer from 'nodemailer'
import conf from "../config/conf";


export class MailService {
    async sendMail(to: string, subject: string, message: string): Promise<any> {
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: conf.googleMailAppEmail,
                pass: conf.googleMailAppPassword,
            }, tls: {
                rejectUnauthorized: false
            }
        });
        let mailOptions = {
            from: conf.googleMailAppEmail,
            to,
            subject,
            html: message,
        };
        try {
            await transporter.sendMail(mailOptions)
            return true
        } catch (error) {
            console.error("error sending email ", error)
            return false
        }
    }
}
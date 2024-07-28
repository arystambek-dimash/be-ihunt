import dotenv from 'dotenv';

dotenv.config()


export default {
    port: process.env.PORT,
    corsOrigins: process.env.CORS_ORIGINS!,
    mongoUri: process.env.MONGO_DB_URI,
    mongodb: process.env.MONGO_DATABASE,

    jwtSecret: process.env.JWT_SECRET_KEY,

    awsSecretKey: process.env.AWS_SECRET_KEY,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY,
    awsRegion: process.env.AWS_REGION,
    awsBucketName: process.env.AWS_BUCKET_NAME,

    hhClientSecret: process.env.HH_CLIENT_SECRET,
    hhClientId: process.env.HH_CLIENT_ID,

    linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,

    openAIApiKey: process.env.OPENAI_API_KEY,
    geminiAIApiKey: process.env.GEMINI_AI_API_KEY,

    googleMailAppEmail: process.env.GOOGLE_MAIL_APP_EMAIL,
    googleMailAppPassword: process.env.GOOGLE_MAIL_APP_PASSWORD,

    serverSideUrl: process.env.SERVER_SIDE_URL,
    clientSideUrl: process.env.CLIENT_SIDE_URL,
}

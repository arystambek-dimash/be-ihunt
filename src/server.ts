import 'express-session';
import cors from 'cors';
import express, {json} from 'express';
import dotenv from 'dotenv';
import conf from './config/conf';
import globalRoutes from './globalRoutes';
import connectDB from './config/db';
import passport from "passport";

import './services/linkedin-service'
import session from "express-session";

dotenv.config();

const app = express();

connectDB();

app.use(json());

app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || conf.corsOrigins?.split(',') || 'https://iamhunt.vercel.app',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(session({
    secret: 'session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: false, maxAge: 60 * 60 * 1000}
}));


app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1', globalRoutes);

app.get('/', (req, res) => {
    res.json('Hello World!');
});

const PORT = conf.port || 8000;

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});

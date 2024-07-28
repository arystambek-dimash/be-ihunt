import 'express-session';
import cors from 'cors';
import express, {json} from 'express';
import dotenv from 'dotenv';
import conf from './config/conf';
import globalRoutes from './globalRoutes';
import connectDB from './config/db';
import passport from "passport";
import MongoStore from 'connect-mongo';

import './services/linkedin-service'
import session from "express-session";
import {job1, job2, job3, job4} from "./jobs/auto-apply";

dotenv.config();

const app = express();

connectDB();

app.use(json());

app.use(cors({
    origin: process.env.CORS_ORIGINS.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: false, maxAge: 60 * 60 * 1000},
    store: MongoStore.create({
        mongoUrl: conf.mongoUri,
        collectionName: 'sessions'
    })
}));


app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1', globalRoutes);

app.get('/', (req, res) => {
    res.json('Hello World!');
});


job1.start()
job2.start()
job3.start()
job4.start()

const PORT = conf.port || 8000;

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});

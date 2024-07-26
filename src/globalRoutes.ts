import {Router} from "express";
import networkRouters from "./routers/network-routers";
import userRouters from "./routers/user-routers";
import vacancyRouters from "./routers/vacany-routers";
import interviewRouters from "./routers/interview-routers";


const globalRoutes = Router()

globalRoutes.use('/networks', networkRouters)
globalRoutes.use('/users', userRouters)
globalRoutes.use('/vacancies', vacancyRouters)
globalRoutes.use('/interviews', interviewRouters)
export default globalRoutes
import {Router} from "express";
import authMiddleware from "../middlewares/auth-middleware";
import {hhLogin} from "../controllers/network-controller";
import passport from "passport";


const networkRouters = Router()

networkRouters.get('/headhunter', authMiddleware, hhLogin)


networkRouters.get('/linkedin',
    passport.authenticate('linkedin'));

networkRouters.get('/linkedin/callback', authMiddleware,
    passport.authenticate('linkedin'));

export default networkRouters;
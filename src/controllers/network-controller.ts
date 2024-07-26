import {Request, Response} from "express";
import HHService from "../services/hh-service";

const hhService = new HHService();

export const hhLogin = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const code = req.query.code as string | undefined;

    if (!code) {
        return res.status(400).json({error: "code is required"});
    }

    try {
        const {access_token, refresh_token} = await hhService.authorization(code);
        user.hasHHAccount = true;
        user.hhAccessToken = access_token;
        user.hhRefreshToken = refresh_token;
        await user.save();

        res.status(200).json({message: "Successfully logged in Head Hunter"});
    } catch (err) {
        console.error(err);
        res.status(401).json({message: "Invalid code"});
    }
};
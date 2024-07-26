import {NextFunction, Request, Response} from "express";
import {UserModel} from "../models/user-model";
import {HrUserModel} from "../models/hr-user-model";
import {JWTService} from "../services/jwt-services";

const jwt_service = new JWTService();

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({message: "No token provided"});
    }

    try {
        const payload: any = await jwt_service.verifyAccessToken(token);
        let user;

        if (payload.isHr) {
            user = await HrUserModel.findById(payload.id);
        } else {
            user = await UserModel.findById(payload.id);
        }

        if (!user) {
            return res.status(401).json({message: "User not found"});
        }

        (req as any).user = user;
        next();
    } catch (err) {
        res.status(401).json({message: "Expired or invalid token"});
    }
};

export default authMiddleware;

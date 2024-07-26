import {Request, Response} from "express";
import Vacancy from "../models/vacancies-model";

export const inputPositions = async (req: Request, res: Response) => {
    const {position} = req.body;
    const user = (req as any).user
    try {
        if (!position) {
            return res.status(403).json({error: "Position is empty"});
        }
        user.positions.push({position, status: 'Active', date: new Date()});
        await user.save();
        res.status(200).json({message: "Position added successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const getPositions = async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
        res.status(200).json({positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};


export const deletePosition = async (req: Request, res: Response) => {
    const {positionId} = req.params;
    const user = (req as any).user;
    try {
        user.positions = user.positions.filter((pos: any) => pos._id.toString() !== positionId);
        await user.save();
        res.status(200).json({message: "Position deleted successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const updatePositionStatus = async (req: Request, res: Response) => {
    const {positionId} = req.params;
    const {status} = req.body;
    const user = (req as any).user;
    try {
        const position = user.positions.id(positionId);
        if (!position) {
            return res.status(404).json({error: "Position not found"});
        }
        position.status = status;
        await user.save();
        res.status(200).json({message: "Position status updated successfully", positions: user.positions});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Internal server error"});
    }
};

export const getResponses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const {page = 1, limit = 10} : any = req.query;

        const vacancies = await Vacancy.find({user: userId})
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Vacancy.countDocuments({user: userId});

        res.status(200).json({
            vacancies,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({message: 'Error retrieving responses', error});
    }
};
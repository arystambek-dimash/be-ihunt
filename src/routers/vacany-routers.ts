import {Router} from "express";
import {
    inputPositions,
    getPositions,
    getResponses,
    deletePosition,
    updatePositionStatus,
} from "../controllers/vacancy-controller";
import authMiddleware from "../middlewares/auth-middleware";

const router = Router();

router.post("/positions", authMiddleware, inputPositions);
router.get("/positions", authMiddleware, getPositions);
router.get("/responses", authMiddleware, getResponses);
router.delete("/positions/:positionId", authMiddleware, deletePosition);
router.patch("/positions/:positionId/status", authMiddleware, updatePositionStatus);

export default router;

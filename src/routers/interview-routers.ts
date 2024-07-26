import express from 'express';

import authMiddleware from "../middlewares/auth-middleware";
import {
    addQuestion, analyzeInterview,
    createInterview,
    deleteInterview,
    deleteQuestion, getInterviewById, getInterviews, getMembersByInterviewID, updateInterview,
    updateQuestion
} from "../controllers/interview-controller";

const router = express.Router();

router.get('/', authMiddleware, getInterviews)
router.post('/', authMiddleware, createInterview);
router.post('/:interviewId/questions', authMiddleware, addQuestion);
router.put('/:interviewId/questions', authMiddleware, updateQuestion);
router.delete('/:interviewId/questions', authMiddleware, deleteQuestion);
router.delete('/:interviewId', authMiddleware, deleteInterview);
router.put('/:interviewId', authMiddleware, updateInterview);
router.get('/', authMiddleware, getInterviewById);

router.get('/:interviewId/analyze', authMiddleware, analyzeInterview);
router.get('/:interviewId/members', getMembersByInterviewID);

export default router;
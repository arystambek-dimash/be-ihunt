import express from 'express';
import {
    registerHr,
    loginHr,
    profile,
    verifyEmail,
    forgotPasswordHr,
    resetPasswordHr,
    forgotPasswordAutoResponse,
    resetPasswordAutoResponse,
    refreshAccessToken,
    registerAutoResponse, loginAutoResponse, updateProfile
} from "../controllers/user-controller";
import authMiddleware from "../middlewares/auth-middleware";
import {upload} from "../services/aws-service";

const router = express.Router();

// HR routes
router.post('/hr/register', upload.single("profileImage"), registerHr);
router.post('/hr/login', loginHr);
router.get('/hr/verify-email', verifyEmail);
router.post('/hr/forgot-password', forgotPasswordHr);
router.post('/hr/reset-password', resetPasswordHr);

// Auto-response user routes
router.post('/auto-response/register', upload.single("profileImage"), registerAutoResponse);
router.post('/auto-response/login', loginAutoResponse);
router.get('/auto-response/verify-email', verifyEmail);
router.post('/auto-response/forgot-password', forgotPasswordAutoResponse);
router.post('/auto-response/reset-password', resetPasswordAutoResponse);

// Shared routes
router.post('/refresh-token', refreshAccessToken);
router.get('/verify-email', verifyEmail);
router.get('/profile', authMiddleware, profile);
router.put('/profile', authMiddleware, upload.single("profileImage"), updateProfile);

export default router;

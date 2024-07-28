import {Request, Response, NextFunction} from "express";
import {HrUserModel, IHrUser} from "../models/hr-user-model";
import {IUser, UserModel} from "../models/user-model";
import {JWTService} from "../services/jwt-services";
import {comparePasswords, hashPassword} from "../services/password-services";
import {s3} from "../services/aws-service";
import {MailService} from "../services/mail-service";
import {decrypt, encrypt} from "../services/encrypt-service";
import conf from "../config/conf";

const jwtService = new JWTService();
const mailService = new MailService();

const registerHr = async (req: Request, res: Response, next: NextFunction) => {
    const {firstName, lastName, email, password} = req.body;
    let profileImageUrl = 'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg?size=626&ext=jpg&ga=GA1.1.2113030492.1720396800&semt=ais_user';

    if (req.file) {
        const params = {
            Bucket: "nfactify",
            Key: Date.now().toString() + req.file.originalname,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        try {
            const data = await s3.upload(params).promise();
            profileImageUrl = data.Location;
        } catch (err) {
            console.error("Error uploading file to S3", err);
            return res.status(500).json({message: "File upload failed", error: err});
        }
    }

    try {
        const existingUser = await HrUserModel.findOne({email});
        if (existingUser) {
            return res.status(409).json({message: "User already exists", error: existingUser});
        }
        const hashedPassword = await hashPassword(password);
        const user = await HrUserModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            profileImage: profileImageUrl
        });

        const tokenResponse: any = await jwtService.generateToken({id: user.id, email: email, isHr: true}, "7d", true);
        const token = tokenResponse.token;

        const emailVerificationMessage = `
            <h1>Welcome to Our Platform, ${firstName}!</h1>
            <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
            <a href="${conf.serverSideUrl}/api/v1/users/verify-email?token=${token}">Verify Email</a>
            <p>If you did not request this registration, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>Your Company Team</p>
        `;

        await mailService.sendMail(email, "Email Verification", emailVerificationMessage);
        res.status(200).json({message: "Registration successful! Please check your email to verify your account."});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
};
const loginHr = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    try {
        const user: any = await HrUserModel.findOne({email});
        if (!user || !await comparePasswords(password, user.password)) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        if (!user.isVerified) {
            return res.status(403).json({message: "Please verify your email before logging in"});
        }

        const tokens: any = await jwtService.generateToken({id: user.id, email: user.email, isHr: true});
        res.status(200).json({message: 'Login successful', tokens});
    } catch (err) {
        console.error("Login error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

const registerAutoResponse = async (req: Request, res: Response, next: NextFunction) => {
    const {email, password, firstName, lastName} = req.body;
    let profileImageUrl = 'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg?size=626&ext=jpg&ga=GA1.1.2113030492.1720396800&semt=ais_user';
    try {
        if (req.file) {
            const params = {
                Bucket: "nfactify",
                Key: Date.now().toString() + req.file.originalname,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            try {
                const data = await s3.upload(params).promise();
                profileImageUrl = data.Location;
            } catch (err) {
                console.error("Error uploading file to S3", err);
                return res.status(500).json({message: "File upload failed", error: err});
            }
        }

        const existingUser = await UserModel.findOne({email});
        if (existingUser) {
            return res.status(409).json({message: "User already exists", error: existingUser});
        }
        const hashedPassword = await hashPassword(password);
        const user = await UserModel.create({
            email,
            password: hashedPassword,
            profileImage: profileImageUrl,
            firstName,
            lastName
        });

        const tokenResponse: any = await jwtService.generateToken({id: user.id, email: email, isHr: false}, "7d", true);
        const token = tokenResponse.token;

        const emailVerificationMessage = `
            <h1>Welcome to Our Platform!</h1>
            <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
            <a href="${conf.serverSideUrl}/api/v1/users/verify-email?token=${token}">Verify Email</a>
            <p>If you did not request this registration, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>Your Company Team</p>
        `;
        await mailService.sendMail(email, "Email Verification", emailVerificationMessage);
        res.status(200).json({message: "Registration successful! Please check your email to verify your account."});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
};
const loginAutoResponse = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    try {
        const user: any = await UserModel.findOne({email});
        if (!user || !await comparePasswords(password, user.password)) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        if (!user.isVerified) {
            return res.status(403).json({message: "Please verify your email before logging in"});
        }

        const tokens: any = await jwtService.generateToken({id: user.id, email: user.email, isHr: false});
        res.status(200).json({message: 'Login successful', tokens});
    } catch (err) {
        console.error("Login error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

const verifyEmail = async (req: Request, res: Response) => {
    const token = req.query.token as string;

    if (!token) {
        return res.status(400).json({message: "Invalid token"});
    }

    try {
        const payload: any = await jwtService.verifyAccessToken(token);
        if (!payload) {
            return res.status(400).json({message: "Invalid or expired token"});
        }

        let user: IHrUser | IUser | null = null;
        if (payload.isHr) {
            user = await (HrUserModel as any).findById(payload.id).exec() as IHrUser | null;
        } else {
            user = await (UserModel as any).findById(payload.id).exec() as IUser | null;
        }

        if (!user) {
            return res.status(400).json({message: "Invalid token"});
        }

        if (user.isVerified) {
            res.redirect(`${conf.clientSideUrl}`)
        }

        user.isVerified = true;
        await user.save();

        const redirectUrl = payload.isHr ? `${conf.clientSideUrl}/hr/login` : `${conf.clientSideUrl}/auto-response/login`;
        res.redirect(redirectUrl);
    } catch (err) {
        console.error("Email verification failed", err);
        res.status(400).json({message: "Invalid token"});
    }
};

const profile = async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
        res.status(200).json({user});
    } catch (err) {
        console.error("Profile retrieval error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

const updateProfile = async (req: Request, res: Response) => {
    const {firstName, lastName, email, password} = req.body;
    const user = (req as any).user;

    if (!user) {
        return res.status(400).json({message: "User not found in request"});
    }

    let profileImageUrl = user.profileImage;

    if (req.file) {
        const bucketName = conf.awsBucketName;

        if (!bucketName) {
            return res.status(500).json({message: "AWS bucket name is not configured"});
        }

        const params = {
            Bucket: bucketName,
            Key: Date.now().toString() + req.file.originalname,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        try {
            const data = await s3.upload(params).promise();
            profileImageUrl = data.Location;
        } catch (err) {
            console.error("Error uploading file to S3", err);
            return res.status(500).json({message: "File upload failed", error: err});
        }
    }

    try {
        if (password) {
            user.password = await hashPassword(password);
        }

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.profileImage = profileImageUrl;

        await user.save();

        res.status(200).json({message: "Profile updated successfully", user});
    } catch (err) {
        console.error("Profile update error", err);
        res.status(500).json({message: "Something went wrong", error: err});
    }
};

const forgotPasswordHr = async (req: Request, res: Response) => {
    const {email} = req.body;

    try {
        const user: any = await HrUserModel.findOne({email});

        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        const token = encrypt(user.id as string);

        const resetPasswordMessage = `
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password. Please click the link below to reset your password:</p>
            <a href="https://localhost:8000/api/v1/users/reset-password?token=${token}">Reset Password</a>
            <p>If you did not request this password reset, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>Your Company Team</p>
        `;

        await mailService.sendMail(email, "Password Reset Request", resetPasswordMessage);
        res.status(200).json({message: "Password reset link has been sent to your email"});
    } catch (err) {
        console.error("Forgot password error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

const resetPasswordHr = async (req: Request, res: Response) => {
    const {token} = req.query;
    const {newPassword} = req.body;

    if (!token) {
        return res.status(400).json({message: "Invalid token"});
    }

    try {
        const payload: any = decrypt(token as string);
        const user: any = await HrUserModel.findById(payload);

        if (!user) {
            return res.status(400).json({message: "Invalid token"});
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        res.status(200).json({message: "Password successfully reset"});
    } catch (err) {
        console.error("Password reset failed", err);
        res.status(400).json({message: "Invalid token"});
    }
};

const forgotPasswordAutoResponse = async (req: Request, res: Response) => {
    const {email} = req.body;

    try {
        const user: any = await UserModel.findOne({email});

        if (!user) {
            return res.status(404).json({message: "User not found"});
        }

        const token = encrypt(user.id as string);

        const resetPasswordMessage = `
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your password. Please click the link below to reset your password:</p>
            <a href="https://localhost:8000/api/v1/users/reset-password?token=${token}">Reset Password</a>
            <p>If you did not request this password reset, please ignore this email.</p>
            <br>
            <p>Best regards,</p>
            <p>Your Company Team</p>
        `;

        await mailService.sendMail(email, "Password Reset Request", resetPasswordMessage);
        res.status(200).json({message: "Password reset link has been sent to your email"});
    } catch (err) {
        console.error("Forgot password error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

const resetPasswordAutoResponse = async (req: Request, res: Response) => {
    const {token} = req.query;
    const {newPassword} = req.body;

    if (!token) {
        return res.status(400).json({message: "Invalid token"});
    }

    try {
        const payload: any = decrypt(token as string);
        const user: any = await UserModel.findById(payload);

        if (!user) {
            return res.status(400).json({message: "Invalid token"});
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        res.status(200).json({message: "Password successfully reset"});
    } catch (err) {
        console.error("Password reset failed", err);
        res.status(400).json({message: "Invalid token"});
    }
};

const refreshAccessToken = async (req: Request, res: Response) => {
    const {refreshToken} = req.body;

    try {
        const newAccessToken = await jwtService.refreshAccessToken(refreshToken);
        if (!newAccessToken) {
            return res.status(401).json({message: "Invalid refresh token"});
        }

        res.status(200).json(newAccessToken);
    } catch (err) {
        console.error("Refresh token error", err);
        res.status(500).json({message: "Something went wrong"});
    }
};

export {
    registerHr,
    registerAutoResponse,
    loginHr,
    loginAutoResponse,
    profile,
    verifyEmail,
    forgotPasswordHr,
    resetPasswordHr,
    updateProfile,
    forgotPasswordAutoResponse,
    resetPasswordAutoResponse,
    refreshAccessToken,
};

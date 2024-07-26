import passport from 'passport';
import {Strategy as LinkedInStrategy, StrategyOptionWithRequest, Profile} from 'passport-linkedin-oauth2';
import {UserModel, IUser} from '../models/user-model';
import {Request} from 'express';
import dotenv from 'dotenv';

dotenv.config();


const linkedInOptions: StrategyOptionWithRequest = {
    clientID: process.env.LINKEDIN_CLIENT_ID as string,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    callbackURL: `${process.env.CLIENT_SIDE_URL}/auto-response/linkedin/callback`,
    scope: ['openid', 'profile', 'email'],
    passReqToCallback: true,
};

passport.use(new LinkedInStrategy(linkedInOptions, async (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void
) => {
    try {
        const user: any = (req as any).user;
        console.log(user);
        if (!user) {
            throw new Error('User not found');
        }

        user.hasLinkedinAccount = true;
        user.linkedinAccessToken = accessToken;
        user.linkedinRefreshToken = refreshToken;
        user.linkedinId = profile.id;

        await user.save();

        return done(null, user);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        return done(err);
    }
}));

passport.serializeUser((user: any, done: (err: any, id?: string) => void) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: IUser | null) => void) => {
    try {
        const user = await UserModel.findById(id).exec();
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
import jwt from 'jsonwebtoken';

interface Token {
    accessToken: string;
    refreshToken: string;
    expiresIn: string | number;
}

interface AccessToken {
    accessToken: string;
}

class JWTService {
    private accessTokenSecret: string;
    private refreshTokenSecret: string;
    private accessTokenExpiry: string;
    private refreshTokenExpiry: string;

    constructor() {
        this.accessTokenSecret = 'defaultAccessTokenSecret';
        this.refreshTokenSecret = 'defaultRefreshTokenSecret';
        this.accessTokenExpiry = '3d';
        this.refreshTokenExpiry = '7d';
    }

    async generateToken(payload: object, expiresIn: string = "1h", onlyHashToken = false): Promise<Token | {
        token: string
    }> {
        if (onlyHashToken) {
            const token = jwt.sign(payload, this.accessTokenSecret, {expiresIn: expiresIn});
            return {token: token};
        }
        const accessToken = jwt.sign(payload, this.accessTokenSecret, {expiresIn: this.accessTokenExpiry});
        const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {expiresIn: this.refreshTokenExpiry});

        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessTokenExpiry,
        };
    }

    verifyAccessToken(token: string) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret);
            return decoded as object;
        } catch (error) {
            console.error('Invalid access token:', error);
            return null;
        }
    }

    async verifyRefreshToken(token: string): Promise<object | null> {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret);
            return decoded as object;
        } catch (error) {
            console.error('Invalid refresh token:', error);
            return null;
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<AccessToken | null> {
        const decoded = await this.verifyRefreshToken(refreshToken);
        if (!decoded) {
            return null;
        }
        const {exp, ...payloadWithoutExp} = decoded as any;

        const newAccessToken = jwt.sign(payloadWithoutExp, this.accessTokenSecret, {expiresIn: this.accessTokenExpiry});
        return {
            accessToken: newAccessToken,
        };
    }
}

export {JWTService, Token};

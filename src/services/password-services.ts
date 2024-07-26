import bcrypt from 'bcrypt';

const hashPassword = async (plainPassword: string): Promise<string> => {
    const saltRounds = 10;
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        return await bcrypt.hash(plainPassword, salt);
    } catch (err) {
        console.error("Error hashing password", err);
        throw new Error("Error hashing password");
    }
};
const comparePasswords = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (err) {
        console.error("Error comparing passwords", err);
        throw new Error("Error comparing passwords");
    }
};

export {comparePasswords, hashPassword}

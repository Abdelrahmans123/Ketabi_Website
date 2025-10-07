import { customAlphabet } from "nanoid";
export const generateOTP = () => {
    const otp = customAlphabet("0123456789", 6)();
    return otp;
};

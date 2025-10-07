import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
export const generateHash = ({ plainText = "", salt = 8 } = {}) => {
	return bcrypt.hashSync(plainText, salt);
};
export const compareHash = ({ plainText = "", hash = "" } = {}) => {
	return bcrypt.compareSync(plainText, hash);
};
export const encrypt = ({ plainText = "", secretKey = "" } = {}) => {
	return CryptoJS.AES.encrypt(plainText, secretKey).toString();
};
export const decrypt = ({ cipherText = "", secretKey = "" } = {}) => {
	const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
	return bytes.toString(CryptoJS.enc.Utf8);
};

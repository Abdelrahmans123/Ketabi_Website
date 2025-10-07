import jsonwebtoken from "jsonwebtoken";
export const generateJWT = (user, expiresIn, jwtid) => {
	return jsonwebtoken.sign(
		{ id: user._id, role: user.role },
		process.env.JWT_SECRET_KEY,
		{
			expiresIn: expiresIn || "1h",
			jwtid: jwtid,
		}
	);
};
export const verifyJWT = (token) => {
	try {
		return jsonwebtoken.verify(token, process.env.JWT_SECRET_KEY);
	} catch (error) {
		throw new Error("Invalid or expired token");
	}
};

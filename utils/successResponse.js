import HTTPStatusText from "./HTTPStatusText.js";

export const successResponse = ({
	res,
	statusCode = 200,
	message = "Success",
	data = null,
}) => {
	return res.status(statusCode).json({
		status: HTTPStatusText.SUCCESS,
		message,
		code: statusCode,
		data,
	});
};

import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";

export const validate = (rules) => {
	return [
		...rules,
		(req, res, next) => {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				let extractedErrors = [];
				errors.array().map((err) => {
					return extractedErrors.push({ [err.path]: err.msg });
				});
				const error = AppError.create(extractedErrors, 400);
				return next(error);
			}
			next();
		},
	];
};

import HTTPStatusText from "../utils/HTTPStatusText.js";
export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        message: "Route Not Found",
        status: HTTPStatusText.FAILURE,
        data: null,
        code: 404,
    });
};

import { STATUS_CODE, STATUS_TEXT } from "../utils/jsend.js";

function notFound(req, res, next) {
  res.status(STATUS_CODE.NOT_FOUND).json({
    status: STATUS_TEXT.FAIL,
    message: "Route not found",
  });
}

export default notFound;

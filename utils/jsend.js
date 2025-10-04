const STATUS_SUCCESS = "success";
const STATUS_FAIL = "fail";
const STATUS_ERROR = "error";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_UNAUTHORIZED = 401;

const STATUS_TEXT = {
  SUCCESS: STATUS_SUCCESS,
  FAIL: STATUS_FAIL,
  ERROR: STATUS_ERROR,
};

const STATUS_CODE = {
  OK: HTTP_OK,
  CREATED: HTTP_CREATED,
  BAD_REQUEST: HTTP_BAD_REQUEST,
  NOT_FOUND: HTTP_NOT_FOUND,
  INTERNAL_ERROR: HTTP_INTERNAL_ERROR,
  UNAUTHORIZED: HTTP_UNAUTHORIZED,
};

function sendJSON(res, statusCode, status, data = null) {
  if (
    (status === STATUS_FAIL || status === STATUS_ERROR) &&
    data &&
    "message" in data
  ) {
    return res.status(statusCode).json({
      status: status,
      message: data.message,
      code: statusCode,
    });
  }

  res.status(statusCode).json({
    status: status,
    data: data,
    code: statusCode,
  });
}

export { sendJSON, STATUS_TEXT, STATUS_CODE };

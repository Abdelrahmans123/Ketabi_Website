import morgan from "morgan";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const rfs = require("rotating-file-stream"); 

morgan.token("user", function (req) {
  return req.user && req.user._id ? String(req.user._id) : "guest";
});

const devFormat = ":method :url :status :res[content-length] - :response-time ms :user";

function createDailyStream() {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return rfs.createStream("access.log", {
    interval: "1d",
    path: logDir,
    compress: "gzip",
    maxFiles: 14
  });
}

function prodFormat(tokens, req, res) {
  const line = {
    time: tokens.date(req, res, "iso"),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    contentLength: Number(tokens.res(req, res, "content-length") || 0),
    responseTimeMs: Number(tokens["response-time"](req, res)),
    user: req.user && req.user._id ? String(req.user._id) : "guest",
    ip: req.ip
  };
  return JSON.stringify(line);
}

export function buildMorgan() {
  if (process.env.NODE_ENV === "production") {
    return morgan(prodFormat, { stream: createDailyStream() });
  }
  return morgan(devFormat);
}

export const morganLogger = buildMorgan();

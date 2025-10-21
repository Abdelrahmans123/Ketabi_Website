import path from "path";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

const logDir = path.join(process.cwd(), "logs");

const errorDailyRotate = new transports.DailyRotateFile({
  filename: path.join(logDir, "error-%DATE%.log"), 
  datePattern: "YYYY-MM-DD",
  level: "error",
  zippedArchive: true,   
  maxSize: "20m",       
  maxFiles: "30d",       
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    errorDailyRotate,               
    new transports.Console({ format: format.simple() }),
  ],
});

export default logger;

import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";

// Extend AppError locally to allow for 'code' and 'keyValue' used in error handling
interface MongoError extends AppError {
  code?: number;
  keyValue?: { [key: string]: any };
  path?: string;
  value?: any;
  errors?: any;
}

const handleCastErrorDB = (err: any): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  // console.log(err);
  const value = err.keyValue.name;
  const message = `Duplicate field value: "${value}". Please use another value`;
  return new AppError(message, 400);
};

const handleJwtTokenError = () =>
  new AppError("Invald token, please log in again.", 401);

const handleJwtExpiredError = () =>
  new AppError("Your token has expired, please log in again.", 401);

const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      message: err.message,
    });
  } else {
    console.log("Error 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong.",
    });
  }
};

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log({ err });
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  // console.log(err.name);
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;

    if (err.name === "CastError") {
      error = handleCastErrorDB(error);
    }

    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }

    if (err.name === "JsonWebTokenError") {
      error = handleJwtTokenError();
    }
    if (err.name === "TokenExpiredError") {
      error = handleJwtExpiredError();
    }

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;

import { Request, Response, NextFunction, RequestHandler } from "express";

const catchAsync =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export default catchAsync;

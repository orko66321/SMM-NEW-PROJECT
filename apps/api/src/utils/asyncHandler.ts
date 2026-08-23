import type { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Express 4 does not auto-catch rejected promises from async route handlers —
// without this, a thrown error in an async handler would crash the process
// (unhandled rejection) instead of returning a clean error response.
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "../types/auth";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as AuthTokenPayload;

    req.user = {
      id: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

// Internal routes are reached only from other services on the private network,
// which forward the customer's JWT. The gateway does not proxy /internal.
export function requireInternalAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
        return next(new AppError(401, "Authentication token is required", "UNAUTHORIZED"));
    }

    try {
        const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
        if (!payload.sub) throw new Error("JWT subject is missing");
        req.authUserId = payload.sub;
        next();
    } catch {
        next(new AppError(401, "Invalid or expired authentication token", "INVALID_TOKEN"));
    }
}
import { AppError } from "../utils/AppError.js";
// Validates and *replaces* req[target] with the parsed/coerced value, so
// every downstream handler works with trusted, typed data — this is the
// single choke point all user input passes through (SQL/NoSQL injection
// and mass-assignment defense: unknown keys are stripped by zod by default).
export function validate(schema, target = "body") {
    return (req, _res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            return next(AppError.badRequest("Validation failed", result.error.flatten()));
        }
        req[target] = result.data;
        next();
    };
}

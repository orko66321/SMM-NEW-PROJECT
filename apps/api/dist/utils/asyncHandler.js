// Express 4 does not auto-catch rejected promises from async route handlers —
// without this, a thrown error in an async handler would crash the process
// (unhandled rejection) instead of returning a clean error response.
export function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}

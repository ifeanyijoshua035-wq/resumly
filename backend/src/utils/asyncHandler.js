// Wraps an async route handler so a rejected promise (e.g. a failed database
// query) reaches Express's error-handling middleware instead of hanging the
// request or crashing the process. Express only auto-catches synchronous
// throws, not async ones - this is the standard workaround.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

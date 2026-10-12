// An Error carrying an HTTP status for the error-handling middleware.
// Its message is always sent to the client, even for 5xx statuses.
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

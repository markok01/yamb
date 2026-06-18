export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorFromValidation(errorCode?: string, message?: string) {
  return new ApiError(400, errorCode ?? "VALIDATION_ERROR", message ?? "Greška validacije");
}

/** Engine / rule violations during an active game turn */
export function apiErrorFromInvalidMove(message?: string) {
  return new ApiError(400, "INVALID_MOVE", message ?? "Potez nije dozvoljen");
}

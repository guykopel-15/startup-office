/** The one shape every IPC handler answers with. */
export interface SuccessResponse<Data> {
  isOk: true;
  data: Data;
}

export interface ErrorResponse {
  isOk: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<Data> = SuccessResponse<Data> | ErrorResponse;

export function successResponse<Data>(data: Data): SuccessResponse<Data> {
  return { isOk: true, data };
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return { isOk: false, error: { code, message } };
}

/** Errors the services throw carry a stable code the renderer can switch on. */
export class ServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = ServiceError.name;
    this.code = code;
  }
}

/** Returns the data of a success response and throws the error of a failure as a ServiceError. */
export function unwrapResponse<Data>(response: ApiResponse<Data>): Data {
  if (response.isOk) return response.data;
  throw new ServiceError(response.error.code, response.error.message);
}

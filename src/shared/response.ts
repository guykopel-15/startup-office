/** The one shape every IPC handler answers with. */
export interface SuccessResponse<Data> {
  ok: true;
  data: Data;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<Data> = SuccessResponse<Data> | ErrorResponse;

export function successResponse<Data>(data: Data): SuccessResponse<Data> {
  return { ok: true, data };
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return { ok: false, error: { code, message } };
}

/** Errors the services throw carry a stable code the renderer can switch on. */
export class ServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

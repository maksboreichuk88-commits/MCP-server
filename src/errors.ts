export class RequestPolicyError extends Error {
  public code: string;

  constructor(message: string, code = 'REQUEST_POLICY_VIOLATION') {
    super(message);
    this.name = 'RequestPolicyError';
    this.code = code;
  }
}

export class AccessPolicyError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, unknown>;

  constructor(message: string, code: string, status = 403, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AccessPolicyError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

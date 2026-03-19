/**
 * CrossToolHijackAttempt — typed security exception.
 * Thrown when simultaneous "red" + "blue" tool access is detected.
 */
export class SecurityException extends Error {
  public readonly code: number;
  public readonly eventType: string;

  constructor(message: string, eventType: string, code: number = 403) {
    super(message);
    this.name = "SecurityException";
    this.code = code;
    this.eventType = eventType;
  }
}

export class CrossToolHijackAttempt extends SecurityException {
  constructor(redTools: string[], blueTools: string[]) {
    super(
      `Cross-Tool Hijack Attempt detected: RED tools [${redTools.join(", ")}] ` +
      `requested simultaneously with BLUE tools [${blueTools.join(", ")}]. Hard Halt enforced.`,
      "CROSS_TOOL_HIJACK",
      403
    );
    this.name = "CrossToolHijackAttempt";
  }
}

export class AuthenticationFailure extends SecurityException {
  constructor(reason: string) {
    super(
      `Authentication Failure (Fail-Closed): ${reason}. Token Passthrough is prohibited.`,
      "AUTH_FAILURE",
      401
    );
    this.name = "AuthenticationFailure";
  }
}

export class SchemaViolation extends SecurityException {
  constructor(detail: string) {
    super(
      `Schema Validation Failure (Fail-Closed): ${detail}. No normalization attempted.`,
      "SCHEMA_VIOLATION",
      400
    );
    this.name = "SchemaViolation";
  }
}

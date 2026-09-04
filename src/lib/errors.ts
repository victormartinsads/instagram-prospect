export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class DuplicateLeadError extends AppError {
  constructor(handle: string) {
    super(
      `Lead with handle ${handle} already exists`,
      "DUPLICATE_LEAD",
      409,
      { handle }
    );
    this.name = "DuplicateLeadError";
  }
}

export class ChannelLockError extends AppError {
  constructor(leadId: string, currentChannel: string) {
    super(
      `Channel lock: lead ${leadId} is owned by ${currentChannel}`,
      "CHANNEL_LOCK",
      409,
      { leadId, currentChannel }
    );
    this.name = "ChannelLockError";
  }
}

export class BudgetExceededError extends AppError {
  constructor(currentCost: number, budget: number) {
    super(
      `OpenAI monthly budget exceeded: \$${currentCost.toFixed(2)} / \$${budget.toFixed(2)}`,
      "BUDGET_EXCEEDED",
      402,
      { currentCost, budget }
    );
    this.name = "BudgetExceededError";
  }
}

export class BrowserUnavailableError extends AppError {
  constructor(reason: string) {
    super(
      `Browser unavailable: ${reason}`,
      "BROWSER_UNAVAILABLE",
      503,
      { reason }
    );
    this.name = "BrowserUnavailableError";
  }
}

export class DoNotContactError extends AppError {
  constructor(handle: string) {
    super(
      `Lead ${handle} is in do_not_contact list`,
      "DO_NOT_CONTACT",
      403,
      { handle }
    );
    this.name = "DoNotContactError";
  }
}

export class RateLimitError extends AppError {
  constructor(resource: string, retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded for ${resource}`,
      "RATE_LIMIT",
      429,
      { resource, retryAfterSeconds }
    );
    this.name = "RateLimitError";
  }
}

export class CircuitOpenError extends AppError {
  constructor(service: string) {
    super(
      `Circuit breaker open for ${service}`,
      "CIRCUIT_OPEN",
      503,
      { service }
    );
    this.name = "CircuitOpenError";
  }
}

export class ApiWindowExpiredError extends AppError {
  constructor(leadId: string) {
    super(
      `API messaging window expired for lead ${leadId}`,
      "API_WINDOW_EXPIRED",
      403,
      { leadId }
    );
    this.name = "ApiWindowExpiredError";
  }
}

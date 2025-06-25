import { logger } from './logger'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: any

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message)
    
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 400, true, context)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, 404, true, { resource, identifier })
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 409, true, context)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, true)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 500, true, context)
  }
}

export class KafkaError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 500, true, context)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: any) {
    super(`External service error from ${service}: ${message}`, 503, true, {
      service,
      ...context
    })
  }
}

// Error handling utilities
export function handleDatabaseError(error: any): AppError {
  // Prisma specific error handling
  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists', {
      constraint: error.meta?.target,
      prismaCode: error.code
    })
  }
  
  if (error.code === 'P2025') {
    return new NotFoundError('Resource', 'specified in the operation')
  }
  
  if (error.code === 'P2003') {
    return new ValidationError('Foreign key constraint failed', {
      field: error.meta?.field_name,
      prismaCode: error.code
    })
  }

  // PostgreSQL specific errors
  if (error.code === '23505') { // unique_violation
    return new ConflictError('Duplicate entry', {
      constraint: error.constraint,
      detail: error.detail
    })
  }
  
  if (error.code === '23503') { // foreign_key_violation
    return new ValidationError('Referenced record does not exist', {
      constraint: error.constraint,
      detail: error.detail
    })
  }

  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new DatabaseError('Database connection failed', {
      code: error.code,
      address: error.address,
      port: error.port
    })
  }

  // Generic database error
  return new DatabaseError(error.message || 'Database operation failed', {
    originalError: error.name,
    code: error.code
  })
}

export function handleKafkaError(error: any): AppError {
  // Connection errors
  if (error.type === 'NETWORK_EXCEPTION' || error.code === 'ECONNREFUSED') {
    return new KafkaError('Failed to connect to Kafka broker', {
      type: error.type,
      broker: error.broker
    })
  }

  // Topic errors
  if (error.type === 'UNKNOWN_TOPIC_OR_PARTITION') {
    return new KafkaError('Topic does not exist', {
      topic: error.topic,
      type: error.type
    })
  }

  // Producer errors
  if (error.type === 'REQUEST_TIMED_OUT') {
    return new KafkaError('Kafka request timeout', {
      type: error.type,
      timeout: error.timeout
    })
  }

  // Generic Kafka error
  return new KafkaError(error.message || 'Kafka operation failed', {
    type: error.type,
    retriable: error.retriable
  })
}

export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

export async function logError(error: Error, context?: any): Promise<void> {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  }

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode
    errorInfo.isOperational = error.isOperational
    errorInfo.context = error.context
  }

  logger.error('Application error:', errorInfo)

  // In production, you might want to send errors to external monitoring services
  if (process.env.NODE_ENV === 'production' && !isOperationalError(error)) {
    // Send to error monitoring service (e.g., Sentry, Bugsnag)
    // await sendToErrorService(errorInfo)
  }
}

export function createErrorResponse(error: AppError, requestId?: string) {
  const response: any = {
    error: error.message,
    timestamp: new Date().toISOString()
  }

  if (requestId) {
    response.requestId = requestId
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    response.statusCode = error.statusCode
    response.stack = error.stack
    
    if (error.context) {
      response.context = error.context
    }
  }

  return response
}

// Async error wrapper for express handlers
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Circuit breaker for external services
export class CircuitBreaker {
  private failures: number = 0
  private nextAttempt: number = Date.now()
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new ExternalServiceError('Circuit Breaker', 'Service temporarily unavailable')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + this.timeout
    }
  }

  getState(): string {
    return this.state
  }

  getFailures(): number {
    return this.failures
  }
}

// Retry utility with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Check if error is retryable
      if (error instanceof AppError && !shouldRetry(error)) {
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      )

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

function shouldRetry(error: AppError): boolean {
  // Don't retry client errors (4xx) except for specific cases
  if (error.statusCode >= 400 && error.statusCode < 500) {
    return error.statusCode === 429 // Rate limit
  }

  // Retry server errors (5xx) and network errors
  return error.statusCode >= 500 || 
         error instanceof DatabaseError ||
         error instanceof KafkaError ||
         error instanceof ExternalServiceError
}
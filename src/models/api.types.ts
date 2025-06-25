import { UserActivity, UserActivityInput } from './user-activity.types'
import { SystemMetric, SystemMetricInput } from './system-metric.types'
import { ErrorLog } from './error-log.types'
import { TopicStatus } from './topic-status.types'
import { KafkaMessage } from './message.types'

// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  error?: string
}

// Statistics response
export interface StatsResponse {
  stats: {
    messages: number
    userActivities: number
    metrics: number
    errors: number
    activeTopics: number
  }
  timestamp: string
}

// Producer API request types
export interface ProduceUserActivityRequest {
  userId: string
  action: string
  resource?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
}

export interface ProduceMetricRequest {
  metricName: string
  value: number
  unit?: string
  tags?: any
}

export interface ProduceErrorLogRequest {
  service: string
  errorType: string
  message: string
  stackTrace?: string
  context?: any
  severity?: 'error' | 'warning' | 'critical'
}

export interface ProduceNotificationRequest {
  type: string
  message: string
  recipients?: string[]
  metadata?: any
}

// Query parameter types
export interface BaseQueryParams {
  limit?: string
  offset?: string
  startDate?: string
  endDate?: string
}

export interface MessageQueryParams extends BaseQueryParams {
  topic?: string
}

export interface UserActivityQueryParams extends BaseQueryParams {
  userId?: string
  action?: string
}

export interface SystemMetricQueryParams extends BaseQueryParams {
  metricName?: string
}

export interface ErrorLogQueryParams extends BaseQueryParams {
  service?: string
  severity?: string
  resolved?: string
}

// API error types
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
  path: string
  method: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ApiErrorResponse {
  error: string
  message?: string
  details?: ValidationError[]
  timestamp: string
  path?: string
  method?: string
}

// Middleware types
export interface RequestWithUser extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

// Configuration types
export interface ApiConfig {
  port: number
  corsOrigins: string[]
  rateLimiting: {
    windowMs: number
    max: number
    message: string
  }
  authentication: {
    jwtSecret: string
    jwtExpiry: string
    refreshTokenExpiry: string
  }
  logging: {
    level: string
    format: string
  }
}
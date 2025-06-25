// Message types
export * from './message.types'

// User activity types
export * from './user-activity.types'

// System metric types
export * from './system-metric.types'

// Error log types
export * from './error-log.types'

// Topic status types
export * from './topic-status.types'

// Notification types
export * from './notification.types'

// API types
export * from './api.types'

// Kafka types
export * from './kafka.types'

// Common utility types
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt?: Date
}

export interface TimestampedEntity extends BaseEntity {
  timestamp: Date
}

export interface PaginatedQuery {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DateRangeQuery {
  startDate?: Date
  endDate?: Date
}

export interface SearchQuery {
  q?: string
  fields?: string[]
}

export type QueryParams = PaginatedQuery & DateRangeQuery & SearchQuery

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test'

export interface ConfigBase {
  env: Environment
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

// Database types
export interface DatabaseConfig {
  url: string
  ssl?: boolean
  maxConnections?: number
  connectionTimeout?: number
}

// Service status types
export type ServiceStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown'

export interface ServiceHealth {
  status: ServiceStatus
  timestamp: Date
  uptime?: number
  version?: string
  dependencies?: Record<string, ServiceStatus>
  metrics?: Record<string, number>
}

// Generic response wrapper
export interface ResponseWrapper<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    version?: string
  }
}
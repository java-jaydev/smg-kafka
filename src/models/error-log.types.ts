export interface ErrorLog {
  id: string
  service: string
  errorType: string
  message: string
  stackTrace?: string | null
  context?: any
  severity: ErrorSeverity
  resolved: boolean
  resolvedAt?: Date | null
  timestamp: Date
  createdAt: Date
}

export interface ErrorLogInput {
  service: string
  errorType: string
  message: string
  stackTrace?: string
  context?: any
  severity?: ErrorSeverity
  timestamp?: Date
}

export interface ErrorLogQueryParams {
  service?: string
  severity?: string
  resolved?: string
  limit?: string
  offset?: string
  startDate?: string
  endDate?: string
}

export interface ErrorLogResponse {
  data: ErrorLog[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type ErrorSeverity = 'error' | 'warning' | 'critical'

export type ServiceName = 
  | 'api'
  | 'producer'
  | 'consumer'
  | 'database'
  | 'kafka'
  | 'external_service'

export interface ErrorContext {
  userId?: string
  requestId?: string
  sessionId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ipAddress?: string
  kafkaPartition?: number
  kafkaOffset?: string
  kafkaTopic?: string
  attempt?: number
  maxRetries?: number
  [key: string]: any
}

export interface ErrorStats {
  totalErrors: number
  errorsByService: Record<string, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  recentErrors: ErrorLog[]
  resolvedErrors: number
  unresolvedErrors: number
}
export interface SystemMetric {
  id: string
  metricName: string
  value: number
  unit?: string | null
  tags?: any
  timestamp: Date
  createdAt: Date
}

export interface SystemMetricInput {
  metricName: string
  value: number
  unit?: string
  tags?: any
  timestamp?: Date
}

export interface SystemMetricQueryParams {
  metricName?: string
  limit?: string
  offset?: string
  startDate?: string
  endDate?: string
}

export interface SystemMetricResponse {
  data: SystemMetric[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface AggregatedMetricQueryParams {
  metricName: string
  period?: 'minute' | 'hour' | 'day'
  startDate?: string
  endDate?: string
}

export interface AggregatedMetric {
  period: string
  avg_value: number
  min_value: number
  max_value: number
  count: number
}

export interface AggregatedMetricResponse {
  data: AggregatedMetric[]
}

export type MetricUnit = 
  | 'percentage'
  | 'count'
  | 'bytes'
  | 'milliseconds'
  | 'seconds'
  | 'requests_per_second'
  | 'cpu_cores'
  | 'memory_mb'
  | 'memory_gb'

export interface MetricTags {
  server?: string
  environment?: string
  service?: string
  endpoint?: string
  status_code?: number
  method?: string
  [key: string]: any
}

export type SystemMetricName = 
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_usage'
  | 'network_in'
  | 'network_out'
  | 'request_count'
  | 'response_time'
  | 'error_rate'
  | 'active_connections'
  | 'queue_size'
import { Consumer, Producer, Admin, KafkaMessage as KafkaJSMessage } from 'kafkajs'

// Kafka configuration types
export interface KafkaConfig {
  brokers: string[]
  clientId: string
  groupId: string
  connectionTimeout?: number
  requestTimeout?: number
  retry?: {
    initialRetryTime: number
    retries: number
  }
}

export interface ProducerConfig {
  maxInFlightRequests?: number
  idempotent?: boolean
  transactionTimeout?: number
  retry?: {
    initialRetryTime: number
    retries: number
  }
}

export interface ConsumerConfig {
  groupId: string
  sessionTimeout?: number
  heartbeatInterval?: number
  maxBytesPerPartition?: number
  retry?: {
    initialRetryTime: number
    retries: number
  }
}

// Topic definitions
export const TOPICS = {
  USER_ACTIVITIES: 'user-activities',
  SYSTEM_METRICS: 'system-metrics',
  ERROR_LOGS: 'error-logs',
  NOTIFICATIONS: 'notifications'
} as const

export type TopicNames = typeof TOPICS[keyof typeof TOPICS]

// Message types for each topic
export interface UserActivityMessage {
  userId: string
  action: string
  resource?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface SystemMetricMessage {
  metricName: string
  value: number
  unit?: string
  tags?: any
  timestamp: string
}

export interface ErrorLogMessage {
  service: string
  errorType: string
  message: string
  stackTrace?: string
  context?: any
  severity: 'error' | 'warning' | 'critical'
  timestamp: string
}

export interface NotificationMessage {
  type: string
  message: string
  recipients?: string[]
  metadata?: any
  timestamp: string
}

// Kafka instance types
export interface KafkaInstances {
  producer: Producer
  consumer: Consumer
  admin: Admin
}

// Message processing types
export interface ProcessedMessage {
  topic: string
  partition: number
  offset: string
  key: string | null
  value: any
  headers?: Record<string, string | null>
  timestamp: Date
}

export interface MessageProcessor {
  topic: TopicNames
  process: (message: ProcessedMessage) => Promise<void>
}

// Producer method types
export interface ProducerMethods {
  sendUserActivity: (data: Omit<UserActivityMessage, 'timestamp'>) => Promise<void>
  sendSystemMetric: (data: Omit<SystemMetricMessage, 'timestamp'>) => Promise<void>
  sendErrorLog: (data: Omit<ErrorLogMessage, 'timestamp'>) => Promise<void>
  sendNotification: (data: Omit<NotificationMessage, 'timestamp'>) => Promise<void>
  createTopics: () => Promise<void>
}

// Consumer stats and monitoring
export interface ConsumerStats {
  groupDescription: any
  groupOffsets: any
  lag?: ConsumerLag[]
}

export interface ConsumerLag {
  topic: string
  partition: number
  currentOffset: string
  highWatermark: string
  lag: number
}

// Topic creation configuration
export interface TopicCreationConfig {
  topic: string
  numPartitions: number
  replicationFactor: number
  configEntries: Array<{
    name: string
    value: string
  }>
}

// Kafka admin operations
export interface AdminOperations {
  createTopics: (topics: TopicCreationConfig[]) => Promise<void>
  deleteTopics: (topics: string[]) => Promise<void>
  listTopics: () => Promise<string[]>
  describeTopics: (topics: string[]) => Promise<any>
  createPartitions: (topicPartitions: any[]) => Promise<void>
  describeGroups: (groupIds: string[]) => Promise<any>
  fetchOffsets: (params: any) => Promise<any>
}

// Error types
export interface KafkaError extends Error {
  type: string
  retriable: boolean
  code?: string
}

export interface ConnectionError extends KafkaError {
  broker: string
  port: number
}

export interface ProducerError extends KafkaError {
  topic: string
  partition?: number
}

export interface ConsumerError extends KafkaError {
  groupId: string
  memberId?: string
}
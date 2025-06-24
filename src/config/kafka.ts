import { Kafka, KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs'
import * as dotenv from 'dotenv'

dotenv.config()

const kafkaConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'smg-kafka-client',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
}

export const kafka = new Kafka(kafkaConfig)

export const producerConfig: ProducerConfig = {
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
}

export const consumerConfig: ConsumerConfig = {
  groupId: process.env.KAFKA_GROUP_ID || 'smg-kafka-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
}

export const TOPICS = {
  USER_ACTIVITIES: 'user-activities',
  SYSTEM_METRICS: 'system-metrics',
  ERROR_LOGS: 'error-logs',
  NOTIFICATIONS: 'notifications'
} as const

export type TopicNames = typeof TOPICS[keyof typeof TOPICS]
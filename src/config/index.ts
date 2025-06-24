import * as dotenv from 'dotenv'

dotenv.config()

export const config = {
  app: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://smguser:smgpassword@localhost:5432/smg_kafka'
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'smg-kafka-client',
    groupId: process.env.KAFKA_GROUP_ID || 'smg-kafka-group'
  }
} as const

export default config
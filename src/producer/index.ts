import { kafka, producerConfig, TOPICS } from '../config/kafka'
import { logger } from '../utils/logger'
import * as dotenv from 'dotenv'

dotenv.config()

export class KafkaProducer {
  private producer = kafka.producer(producerConfig)
  private isConnected = false

  async connect(): Promise<void> {
    try {
      await this.producer.connect()
      this.isConnected = true
      logger.info('Kafka Producer connected successfully')
    } catch (error) {
      logger.error('Failed to connect Kafka Producer:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect()
      this.isConnected = false
      logger.info('Kafka Producer disconnected successfully')
    } catch (error) {
      logger.error('Failed to disconnect Kafka Producer:', error)
      throw error
    }
  }

  async sendUserActivity(data: {
    userId: string
    action: string
    resource?: string
    metadata?: any
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    await this.sendMessage(TOPICS.USER_ACTIVITIES, {
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  async sendSystemMetric(data: {
    metricName: string
    value: number
    unit?: string
    tags?: any
  }): Promise<void> {
    await this.sendMessage(TOPICS.SYSTEM_METRICS, {
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  async sendErrorLog(data: {
    service: string
    errorType: string
    message: string
    stackTrace?: string
    context?: any
    severity?: 'error' | 'warning' | 'critical'
  }): Promise<void> {
    await this.sendMessage(TOPICS.ERROR_LOGS, {
      ...data,
      severity: data.severity || 'error',
      timestamp: new Date().toISOString()
    })
  }

  async sendNotification(data: {
    type: string
    message: string
    recipients?: string[]
    metadata?: any
  }): Promise<void> {
    await this.sendMessage(TOPICS.NOTIFICATIONS, {
      ...data,
      timestamp: new Date().toISOString()
    })
  }

  private async sendMessage(topic: string, value: any, key?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer is not connected')
    }

    try {
      const result = await this.producer.send({
        topic,
        messages: [
          {
            key: key || null,
            value: JSON.stringify(value),
            timestamp: Date.now().toString(),
            headers: {
              'content-type': 'application/json',
              'producer-id': 'smg-kafka-producer',
              'created-at': new Date().toISOString()
            }
          }
        ]
      })

      logger.info(`Message sent to topic ${topic}:`, {
        partition: result[0].partition,
        offset: result[0].baseOffset,
        timestamp: result[0].logAppendTime
      })
    } catch (error) {
      logger.error(`Failed to send message to topic ${topic}:`, error)
      throw error
    }
  }

  async createTopics(): Promise<void> {
    const admin = kafka.admin()
    
    try {
      await admin.connect()
      logger.info('Kafka Admin connected')

      const topics = Object.values(TOPICS).map(topic => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: 'cleanup.policy', value: 'delete' },
          { name: 'retention.ms', value: '604800000' } // 7 days
        ]
      }))

      await admin.createTopics({
        topics,
        waitForLeaders: true,
        timeout: 30000
      })

      logger.info('Topics created successfully:', Object.values(TOPICS))
    } catch (error) {
      logger.error('Failed to create topics:', error)
      throw error
    } finally {
      await admin.disconnect()
    }
  }
}

// 프로듀서 인스턴스를 직접 실행하는 경우
async function main() {
  const producer = new KafkaProducer()
  
  try {
    await producer.connect()
    await producer.createTopics()

    // 샘플 데이터 생성
    logger.info('Starting to send sample messages...')

    // 사용자 활동 샘플
    await producer.sendUserActivity({
      userId: 'user-001',
      action: 'login',
      resource: '/dashboard',
      metadata: { browser: 'Chrome', version: '120.0' },
      ipAddress: '192.168.1.100'
    })

    // 시스템 메트릭 샘플
    await producer.sendSystemMetric({
      metricName: 'cpu_usage',
      value: 75.5,
      unit: 'percentage',
      tags: { server: 'web-01', environment: 'production' }
    })

    // 에러 로그 샘플
    await producer.sendErrorLog({
      service: 'api',
      errorType: 'DatabaseConnectionError',
      message: 'Failed to connect to database',
      severity: 'error',
      context: { attempt: 3, maxRetries: 5 }
    })

    // 알림 샘플
    await producer.sendNotification({
      type: 'system_alert',
      message: 'High CPU usage detected on server web-01',
      recipients: ['admin@company.com'],
      metadata: { alertLevel: 'warning', threshold: 80 }
    })

    logger.info('Sample messages sent successfully')

    // 주기적으로 메트릭 데이터 전송 (예시)
    const metricsInterval = setInterval(async () => {
      await producer.sendSystemMetric({
        metricName: 'memory_usage',
        value: Math.random() * 100,
        unit: 'percentage',
        tags: { server: 'web-01' }
      })
      
      await producer.sendSystemMetric({
        metricName: 'request_count',
        value: Math.floor(Math.random() * 1000),
        unit: 'count',
        tags: { endpoint: '/api/users' }
      })
    }, 5000)

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down producer...')
      clearInterval(metricsInterval)
      await producer.disconnect()
      process.exit(0)
    })

  } catch (error) {
    logger.error('Producer error:', error)
    await producer.disconnect()
    process.exit(1)
  }
}

// 스크립트로 직접 실행하는 경우
if (require.main === module) {
  main().catch(console.error)
}

export default KafkaProducer
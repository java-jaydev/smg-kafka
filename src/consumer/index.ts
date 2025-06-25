import { kafka, consumerConfig, TOPICS } from '../config/kafka'
import { logger } from '../utils/logger'
import prisma from '../config/database'
import * as dotenv from 'dotenv'

dotenv.config()

export class KafkaConsumer {
  private consumer = kafka.consumer(consumerConfig)
  private isConnected = false

  async connect(): Promise<void> {
    try {
      await this.consumer.connect()
      this.isConnected = true
      logger.info('Kafka Consumer connected successfully')
    } catch (error) {
      logger.error('Failed to connect Kafka Consumer:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect()
      this.isConnected = false
      logger.info('Kafka Consumer disconnected successfully')
    } catch (error) {
      logger.error('Failed to disconnect Kafka Consumer:', error)
      throw error
    }
  }

  async subscribe(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected')
    }

    try {
      await this.consumer.subscribe({
        topics: Object.values(TOPICS),
        fromBeginning: false
      })
      logger.info('Subscribed to topics:', Object.values(TOPICS))
    } catch (error) {
      logger.error('Failed to subscribe to topics:', error)
      throw error
    }
  }

  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected')
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value?.toString()
          const key = message.key?.toString()
          const headers = message.headers

          if (!value) {
            logger.warn('Received message with empty value', { topic, partition, offset: message.offset })
            return
          }

          const parsedValue = JSON.parse(value)
          
          logger.info(`Processing message from ${topic}:`, {
            partition,
            offset: message.offset,
            key,
            timestamp: message.timestamp
          })

          // 메시지를 데이터베이스에 저장
          await this.saveMessage(topic, partition, message.offset, key || null, parsedValue, headers)

          // 토픽별 특별 처리
          await this.processMessageByTopic(topic, parsedValue)

          // 토픽 상태 업데이트
          await this.updateTopicStatus(topic)

        } catch (error) {
          logger.error('Error processing message:', error)
          
          // 에러 로그를 데이터베이스에 저장
          await this.saveErrorLog({
            service: 'consumer',
            errorType: 'MessageProcessingError',
            message: error instanceof Error ? error.message : 'Unknown error',
            stackTrace: error instanceof Error ? error.stack : undefined,
            context: {
              topic,
              partition,
              offset: message.offset,
              messageKey: message.key?.toString()
            },
            severity: 'error'
          })
        }
      }
    })
  }

  private async saveMessage(
    topic: string,
    partition: number,
    offset: string,
    key: string | null,
    value: any,
    headers: any
  ): Promise<void> {
    try {
      await prisma.message.create({
        data: {
          topic,
          partition,
          offset,
          key,
          value,
          headers: headers ? Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k, v?.toString() || null])
          ) : undefined,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Failed to save message to database:', error)
      throw error
    }
  }

  private async processMessageByTopic(topic: string, data: any): Promise<void> {
    switch (topic) {
      case TOPICS.USER_ACTIVITIES:
        await this.processUserActivity(data)
        break
      case TOPICS.SYSTEM_METRICS:
        await this.processSystemMetric(data)
        break
      case TOPICS.ERROR_LOGS:
        await this.processErrorLog(data)
        break
      case TOPICS.NOTIFICATIONS:
        await this.processNotification(data)
        break
      default:
        logger.warn(`Unknown topic: ${topic}`)
    }
  }

  private async processUserActivity(data: any): Promise<void> {
    try {
      await prisma.userActivity.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(data.timestamp)
        }
      })
      logger.debug('User activity saved:', data.userId, data.action)
    } catch (error) {
      logger.error('Failed to save user activity:', error)
      throw error
    }
  }

  private async processSystemMetric(data: any): Promise<void> {
    try {
      await prisma.systemMetric.create({
        data: {
          metricName: data.metricName,
          value: data.value,
          unit: data.unit,
          tags: data.tags,
          timestamp: new Date(data.timestamp)
        }
      })
      logger.debug('System metric saved:', data.metricName, data.value)
    } catch (error) {
      logger.error('Failed to save system metric:', error)
      throw error
    }
  }

  private async processErrorLog(data: any): Promise<void> {
    try {
      await prisma.errorLog.create({
        data: {
          service: data.service,
          errorType: data.errorType,
          message: data.message,
          stackTrace: data.stackTrace,
          context: data.context,
          severity: data.severity,
          timestamp: new Date(data.timestamp)
        }
      })
      logger.debug('Error log saved:', data.service, data.errorType)
    } catch (error) {
      logger.error('Failed to save error log:', error)
      throw error
    }
  }

  private async processNotification(data: any): Promise<void> {
    try {
      // 알림 처리 로직 (이메일 발송, 슬랙 메시지 등)
      logger.info('Processing notification:', data.type, data.message)
      
      // 실제 알림 발송 로직을 여기에 구현
      // 예: 이메일 서비스, 슬랙 API, 웹훅 등
      
    } catch (error) {
      logger.error('Failed to process notification:', error)
      throw error
    }
  }

  private async updateTopicStatus(topic: string): Promise<void> {
    try {
      await prisma.topicStatus.upsert({
        where: { topicName: topic },
        update: {
          lastMessageAt: new Date(),
          messageCount: { increment: 1 }
        },
        create: {
          topicName: topic,
          partitionCount: 3, // 기본값
          replicationFactor: 1, // 기본값
          isActive: true,
          lastMessageAt: new Date(),
          messageCount: 1
        }
      })
    } catch (error) {
      logger.error('Failed to update topic status:', error)
    }
  }

  private async saveErrorLog(errorData: {
    service: string
    errorType: string
    message: string
    stackTrace?: string
    context?: any
    severity: 'error' | 'warning' | 'critical'
  }): Promise<void> {
    try {
      await prisma.errorLog.create({
        data: {
          ...errorData,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Failed to save error log to database:', error)
    }
  }

  async getConsumerStats(): Promise<any> {
    try {
      const admin = kafka.admin()
      await admin.connect()

      const groupDescription = await admin.describeGroups([consumerConfig.groupId!])
      const groupOffsets = await admin.fetchOffsets({
        groupId: consumerConfig.groupId!,
        topics: Object.values(TOPICS)
      })

      await admin.disconnect()

      return {
        groupDescription,
        groupOffsets
      }
    } catch (error) {
      logger.error('Failed to get consumer stats:', error)
      throw error
    }
  }
}

// 컨슈머를 직접 실행하는 경우
async function main() {
  const consumer = new KafkaConsumer()
  
  try {
    await consumer.connect()
    await consumer.subscribe()
    
    logger.info('Starting to consume messages...')
    await consumer.startConsuming()

  } catch (error) {
    logger.error('Consumer error:', error)
    await consumer.disconnect()
    process.exit(1)
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down consumer...')
    await consumer.disconnect()
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('Shutting down consumer...')
    await consumer.disconnect()
    await prisma.$disconnect()
    process.exit(0)
  })
}

// 스크립트로 직접 실행하는 경우
if (require.main === module) {
  main().catch(console.error)
}

export default KafkaConsumer
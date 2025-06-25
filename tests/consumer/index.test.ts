import { KafkaConsumer } from '../../src/consumer'
import { TOPICS } from '../../src/config/kafka'

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  message: {
    create: jest.fn()
  },
  userActivity: {
    create: jest.fn()
  },
  systemMetric: {
    create: jest.fn()
  },
  errorLog: {
    create: jest.fn()
  },
  topicStatus: {
    upsert: jest.fn()
  }
}))

jest.mock('kafkajs', () => ({
  kafka: {
    consumer: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn()
    })),
    admin: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      describeGroups: jest.fn(),
      fetchOffsets: jest.fn()
    }))
  }
}))

describe('KafkaConsumer', () => {
  let consumer: KafkaConsumer
  let mockConsumerInstance: any
  let mockPrisma: any
  
  beforeEach(() => {
    const kafkajs = require('kafkajs')
    mockConsumerInstance = kafkajs.kafka.consumer()
    mockPrisma = require('../../src/config/database')
    consumer = new KafkaConsumer()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Connection Management', () => {
    it('should connect to Kafka', async () => {
      await consumer.connect()
      expect(mockConsumerInstance.connect).toHaveBeenCalled()
    })
    
    it('should disconnect from Kafka', async () => {
      await consumer.connect()
      await consumer.disconnect()
      expect(mockConsumerInstance.disconnect).toHaveBeenCalled()
    })
    
    it('should subscribe to topics', async () => {
      await consumer.connect()
      await consumer.subscribe()
      
      expect(mockConsumerInstance.subscribe).toHaveBeenCalledWith({
        topics: Object.values(TOPICS),
        fromBeginning: false
      })
    })
  })
  
  describe('Message Processing', () => {
    beforeEach(async () => {
      await consumer.connect()
      await consumer.subscribe()
    })
    
    it('should process user activity messages', async () => {
      const messageData = {
        userId: 'test-user',
        action: 'login',
        resource: '/dashboard',
        timestamp: new Date().toISOString()
      }
      
      // Simulate message processing
      const mockMessage = {
        topic: TOPICS.USER_ACTIVITIES,
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(messageData)),
          key: Buffer.from('test-key'),
          offset: '123',
          timestamp: Date.now().toString(),
          headers: {}
        }
      }
      
      // Access the message handler from the run call
      await consumer.startConsuming()
      const runCall = mockConsumerInstance.run.mock.calls[0]
      const messageHandler = runCall[0].eachMessage
      
      await messageHandler(mockMessage)
      
      expect(mockPrisma.message.create).toHaveBeenCalled()
      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'test-user',
          action: 'login',
          resource: '/dashboard'
        })
      })
    })
    
    it('should process system metric messages', async () => {
      const messageData = {
        metricName: 'cpu_usage',
        value: 75.5,
        unit: 'percentage',
        timestamp: new Date().toISOString()
      }
      
      const mockMessage = {
        topic: TOPICS.SYSTEM_METRICS,
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(messageData)),
          key: null,
          offset: '124',
          timestamp: Date.now().toString(),
          headers: {}
        }
      }
      
      await consumer.startConsuming()
      const runCall = mockConsumerInstance.run.mock.calls[0]
      const messageHandler = runCall[0].eachMessage
      
      await messageHandler(mockMessage)
      
      expect(mockPrisma.systemMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metricName: 'cpu_usage',
          value: 75.5,
          unit: 'percentage'
        })
      })
    })
    
    it('should handle message processing errors', async () => {
      const messageData = { invalid: 'data' }
      
      const mockMessage = {
        topic: TOPICS.USER_ACTIVITIES,
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(messageData)),
          key: null,
          offset: '125',
          timestamp: Date.now().toString(),
          headers: {}
        }
      }
      
      // Mock database error
      mockPrisma.userActivity.create.mockRejectedValue(new Error('Database error'))
      
      await consumer.startConsuming()
      const runCall = mockConsumerInstance.run.mock.calls[0]
      const messageHandler = runCall[0].eachMessage
      
      await messageHandler(mockMessage)
      
      // Should save error log
      expect(mockPrisma.errorLog.create).toHaveBeenCalled()
    })
    
    it('should update topic status', async () => {
      const messageData = { test: 'data' }
      
      const mockMessage = {
        topic: TOPICS.NOTIFICATIONS,
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(messageData)),
          key: null,
          offset: '126',
          timestamp: Date.now().toString(),
          headers: {}
        }
      }
      
      await consumer.startConsuming()
      const runCall = mockConsumerInstance.run.mock.calls[0]
      const messageHandler = runCall[0].eachMessage
      
      await messageHandler(mockMessage)
      
      expect(mockPrisma.topicStatus.upsert).toHaveBeenCalledWith({
        where: { topicName: TOPICS.NOTIFICATIONS },
        update: {
          lastMessageAt: expect.any(Date),
          messageCount: { increment: 1 }
        },
        create: expect.objectContaining({
          topicName: TOPICS.NOTIFICATIONS,
          isActive: true,
          messageCount: 1
        })
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should throw error when subscribing without connection', async () => {
      await expect(consumer.subscribe())
        .rejects.toThrow('Consumer is not connected')
    })
    
    it('should throw error when starting consumption without connection', async () => {
      await expect(consumer.startConsuming())
        .rejects.toThrow('Consumer is not connected')
    })
  })
})
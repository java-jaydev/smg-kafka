import { KafkaProducer } from '../../src/producer'
import { TOPICS } from '../../src/config/kafka'

// Mock kafkajs
jest.mock('kafkajs', () => ({
  kafka: {
    producer: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(() => Promise.resolve([{
        partition: 0,
        baseOffset: '123',
        logAppendTime: '1234567890'
      }]))
    })),
    admin: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      createTopics: jest.fn()
    }))
  }
}))

describe('KafkaProducer', () => {
  let producer: KafkaProducer
  let mockProducerInstance: any
  
  beforeEach(() => {
    const kafkajs = require('kafkajs')
    mockProducerInstance = kafkajs.kafka.producer()
    producer = new KafkaProducer()
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Connection Management', () => {
    it('should connect to Kafka', async () => {
      await producer.connect()
      expect(mockProducerInstance.connect).toHaveBeenCalled()
    })
    
    it('should disconnect from Kafka', async () => {
      await producer.connect()
      await producer.disconnect()
      expect(mockProducerInstance.disconnect).toHaveBeenCalled()
    })
    
    it('should handle connection errors', async () => {
      mockProducerInstance.connect.mockRejectedValue(new Error('Connection failed'))
      
      await expect(producer.connect()).rejects.toThrow('Connection failed')
    })
  })
  
  describe('Message Sending', () => {
    beforeEach(async () => {
      await producer.connect()
    })
    
    it('should send user activity message', async () => {
      const activityData = {
        userId: 'test-user',
        action: 'login',
        resource: '/dashboard',
        metadata: { browser: 'Chrome' }
      }
      
      await producer.sendUserActivity(activityData)
      
      expect(mockProducerInstance.send).toHaveBeenCalledWith({
        topic: TOPICS.USER_ACTIVITIES,
        messages: [{
          key: null,
          value: expect.stringContaining('test-user'),
          timestamp: expect.any(String),
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'producer-id': 'smg-kafka-producer'
          })
        }]
      })
    })
    
    it('should send system metric message', async () => {
      const metricData = {
        metricName: 'cpu_usage',
        value: 75.5,
        unit: 'percentage',
        tags: { server: 'web-01' }
      }
      
      await producer.sendSystemMetric(metricData)
      
      expect(mockProducerInstance.send).toHaveBeenCalledWith({
        topic: TOPICS.SYSTEM_METRICS,
        messages: [{
          key: null,
          value: expect.stringContaining('cpu_usage'),
          timestamp: expect.any(String),
          headers: expect.objectContaining({
            'content-type': 'application/json'
          })
        }]
      })
    })
    
    it('should send error log message', async () => {
      const errorData = {
        service: 'api',
        errorType: 'DatabaseError',
        message: 'Connection timeout',
        severity: 'error' as const
      }
      
      await producer.sendErrorLog(errorData)
      
      expect(mockProducerInstance.send).toHaveBeenCalledWith({
        topic: TOPICS.ERROR_LOGS,
        messages: [{
          key: null,
          value: expect.stringContaining('DatabaseError'),
          timestamp: expect.any(String),
          headers: expect.any(Object)
        }]
      })
    })
    
    it('should send notification message', async () => {
      const notificationData = {
        type: 'system_alert',
        message: 'High CPU usage detected',
        recipients: ['admin@example.com']
      }
      
      await producer.sendNotification(notificationData)
      
      expect(mockProducerInstance.send).toHaveBeenCalledWith({
        topic: TOPICS.NOTIFICATIONS,
        messages: [{
          key: null,
          value: expect.stringContaining('system_alert'),
          timestamp: expect.any(String),
          headers: expect.any(Object)
        }]
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should throw error when sending message without connection', async () => {
      const activityData = {
        userId: 'test-user',
        action: 'login'
      }
      
      await expect(producer.sendUserActivity(activityData))
        .rejects.toThrow('Producer is not connected')
    })
    
    it('should handle send message errors', async () => {
      await producer.connect()
      mockProducerInstance.send.mockRejectedValue(new Error('Send failed'))
      
      const activityData = {
        userId: 'test-user',
        action: 'login'
      }
      
      await expect(producer.sendUserActivity(activityData))
        .rejects.toThrow('Send failed')
    })
  })
})
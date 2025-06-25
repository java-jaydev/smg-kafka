import request from 'supertest'
import app from '../../src/api'

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  $queryRaw: jest.fn(),
  message: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  userActivity: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  systemMetric: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  errorLog: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  topicStatus: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  $connect: jest.fn(),
  $disconnect: jest.fn()
}))

jest.mock('../../src/producer', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendUserActivity: jest.fn(),
    sendSystemMetric: jest.fn()
  }))
})

describe('API Server', () => {
  let mockPrisma: any
  
  beforeEach(() => {
    mockPrisma = require('../../src/config/database')
  })
  
  afterEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      })
    })
    
    it('should return unhealthy status on database error', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'))
      
      const response = await request(app)
        .get('/health')
        .expect(503)
      
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Database connection failed'
      })
    })
  })
  
  describe('Messages API', () => {
    it('should get messages with pagination', async () => {
      const mockMessages = [
        {
          id: '1',
          topic: 'user-activities',
          partition: 0,
          offset: '123',
          key: null,
          value: { test: 'data' },
          timestamp: new Date(),
          createdAt: new Date()
        }
      ]
      
      mockPrisma.message.findMany.mockResolvedValue(mockMessages)
      mockPrisma.message.count.mockResolvedValue(1)
      
      const response = await request(app)
        .get('/api/messages')
        .expect(200)
      
      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            topic: 'user-activities'
          })
        ]),
        pagination: {
          total: 1,
          limit: 100,
          offset: 0,
          hasMore: false
        }
      })
    })
    
    it('should filter messages by topic', async () => {
      mockPrisma.message.findMany.mockResolvedValue([])
      mockPrisma.message.count.mockResolvedValue(0)
      
      await request(app)
        .get('/api/messages?topic=user-activities')
        .expect(200)
      
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { topic: 'user-activities' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
        select: expect.any(Object)
      })
    })
  })
  
  describe('User Activities API', () => {
    it('should get user activities', async () => {
      const mockActivities = [
        {
          id: '1',
          userId: 'user-123',
          action: 'login',
          timestamp: new Date()
        }
      ]
      
      mockPrisma.userActivity.findMany.mockResolvedValue(mockActivities)
      mockPrisma.userActivity.count.mockResolvedValue(1)
      
      const response = await request(app)
        .get('/api/user-activities')
        .expect(200)
      
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        userId: 'user-123',
        action: 'login'
      })
    })
  })
  
  describe('System Metrics API', () => {
    it('should get system metrics', async () => {
      const mockMetrics = [
        {
          id: '1',
          metricName: 'cpu_usage',
          value: 75.5,
          timestamp: new Date()
        }
      ]
      
      mockPrisma.systemMetric.findMany.mockResolvedValue(mockMetrics)
      mockPrisma.systemMetric.count.mockResolvedValue(1)
      
      const response = await request(app)
        .get('/api/metrics')
        .expect(200)
      
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0]).toMatchObject({
        metricName: 'cpu_usage',
        value: 75.5
      })
    })
  })
  
  describe('Producer API', () => {
    it('should send user activity via producer', async () => {
      const activityData = {
        userId: 'user-123',
        action: 'login',
        resource: '/dashboard'
      }
      
      const response = await request(app)
        .post('/api/produce/user-activity')
        .send(activityData)
        .expect(200)
      
      expect(response.body).toMatchObject({
        success: true,
        message: 'User activity sent to Kafka'
      })
    })
    
    it('should validate required fields for user activity', async () => {
      const invalidData = {
        action: 'login'
        // missing userId
      }
      
      const response = await request(app)
        .post('/api/produce/user-activity')
        .send(invalidData)
        .expect(400)
      
      expect(response.body).toMatchObject({
        error: 'userId and action are required'
      })
    })
    
    it('should send metric via producer', async () => {
      const metricData = {
        metricName: 'cpu_usage',
        value: 75.5,
        unit: 'percentage'
      }
      
      const response = await request(app)
        .post('/api/produce/metric')
        .send(metricData)
        .expect(200)
      
      expect(response.body).toMatchObject({
        success: true,
        message: 'Metric sent to Kafka'
      })
    })
  })
  
  describe('Statistics API', () => {
    it('should get system statistics', async () => {
      mockPrisma.message.count.mockResolvedValue(100)
      mockPrisma.userActivity.count.mockResolvedValue(50)
      mockPrisma.systemMetric.count.mockResolvedValue(200)
      mockPrisma.errorLog.count.mockResolvedValue(5)
      mockPrisma.topicStatus.count.mockResolvedValue(4)
      
      const response = await request(app)
        .get('/api/stats')
        .expect(200)
      
      expect(response.body).toMatchObject({
        stats: {
          messages: 100,
          userActivities: 50,
          metrics: 200,
          errors: 5,
          activeTopics: 4
        },
        timestamp: expect.any(String)
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404)
      
      expect(response.body).toMatchObject({
        error: 'Not found',
        path: '/api/unknown-endpoint'
      })
    })
    
    it('should handle database errors gracefully', async () => {
      mockPrisma.message.findMany.mockRejectedValue(new Error('Database error'))
      
      const response = await request(app)
        .get('/api/messages')
        .expect(500)
      
      expect(response.body).toMatchObject({
        error: 'Failed to fetch messages'
      })
    })
  })
})
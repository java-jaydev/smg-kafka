import express, { Application, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import config from '../config'
import KafkaProducer from '../producer'
import KafkaConsumer from '../consumer'
import * as dotenv from 'dotenv'

dotenv.config()

const app: Application = express()
const prisma = new PrismaClient()
const kafkaProducer = new KafkaProducer()

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS 설정
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// 요청 로깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  })
  next()
})

// Health Check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // 데이터베이스 연결 확인
    await prisma.$queryRaw`SELECT 1`
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Messages API
app.get('/api/messages', async (req: Request, res: Response) => {
  try {
    const { topic, limit = '100', offset = '0', startDate, endDate } = req.query
    
    const where: any = {}
    if (topic) where.topic = topic as string
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate as string)
      if (endDate) where.timestamp.lte = new Date(endDate as string)
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        topic: true,
        partition: true,
        offset: true,
        key: true,
        value: true,
        timestamp: true,
        createdAt: true
      }
    })

    const total = await prisma.message.count({ where })

    res.json({
      data: messages,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    })
  } catch (error) {
    logger.error('Failed to fetch messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// User Activities API
app.get('/api/user-activities', async (req: Request, res: Response) => {
  try {
    const { userId, action, limit = '100', offset = '0', startDate, endDate } = req.query
    
    const where: any = {}
    if (userId) where.userId = userId as string
    if (action) where.action = action as string
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate as string)
      if (endDate) where.timestamp.lte = new Date(endDate as string)
    }

    const activities = await prisma.userActivity.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.userActivity.count({ where })

    res.json({
      data: activities,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    })
  } catch (error) {
    logger.error('Failed to fetch user activities:', error)
    res.status(500).json({ error: 'Failed to fetch user activities' })
  }
})

// System Metrics API
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const { metricName, limit = '100', offset = '0', startDate, endDate } = req.query
    
    const where: any = {}
    if (metricName) where.metricName = metricName as string
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate as string)
      if (endDate) where.timestamp.lte = new Date(endDate as string)
    }

    const metrics = await prisma.systemMetric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.systemMetric.count({ where })

    res.json({
      data: metrics,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    })
  } catch (error) {
    logger.error('Failed to fetch metrics:', error)
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
})

// Aggregated Metrics API
app.get('/api/metrics/aggregated', async (req: Request, res: Response) => {
  try {
    const { metricName, period = 'hour', startDate, endDate } = req.query
    
    if (!metricName) {
      return res.status(400).json({ error: 'metricName is required' })
    }

    const where: any = { metricName: metricName as string }
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate as string)
      if (endDate) where.timestamp.lte = new Date(endDate as string)
    }

    let dateFormat: string
    switch (period) {
      case 'minute':
        dateFormat = 'YYYY-MM-DD HH24:MI'
        break
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24'
        break
      case 'day':
        dateFormat = 'YYYY-MM-DD'
        break
      default:
        dateFormat = 'YYYY-MM-DD HH24'
    }

    const result = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(timestamp, ${dateFormat}) as period,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as count
      FROM system_metrics 
      WHERE metric_name = ${metricName as string}
        ${startDate ? `AND timestamp >= ${new Date(startDate as string)}` : ''}
        ${endDate ? `AND timestamp <= ${new Date(endDate as string)}` : ''}
      GROUP BY TO_CHAR(timestamp, ${dateFormat})
      ORDER BY period DESC
      LIMIT 100
    `

    res.json({ data: result })
  } catch (error) {
    logger.error('Failed to fetch aggregated metrics:', error)
    res.status(500).json({ error: 'Failed to fetch aggregated metrics' })
  }
})

// Error Logs API
app.get('/api/errors', async (req: Request, res: Response) => {
  try {
    const { service, severity, resolved, limit = '100', offset = '0' } = req.query
    
    const where: any = {}
    if (service) where.service = service as string
    if (severity) where.severity = severity as string
    if (resolved !== undefined) where.resolved = resolved === 'true'

    const errors = await prisma.errorLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.errorLog.count({ where })

    res.json({
      data: errors,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + parseInt(limit as string)
      }
    })
  } catch (error) {
    logger.error('Failed to fetch error logs:', error)
    res.status(500).json({ error: 'Failed to fetch error logs' })
  }
})

// Topic Status API
app.get('/api/topics', async (req: Request, res: Response) => {
  try {
    const topics = await prisma.topicStatus.findMany({
      orderBy: { lastMessageAt: 'desc' }
    })

    res.json({ data: topics })
  } catch (error) {
    logger.error('Failed to fetch topic status:', error)
    res.status(500).json({ error: 'Failed to fetch topic status' })
  }
})

// Producer API - 메시지 발송
app.post('/api/produce/user-activity', async (req: Request, res: Response) => {
  try {
    const { userId, action, resource, metadata, ipAddress, userAgent } = req.body
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action are required' })
    }

    await kafkaProducer.sendUserActivity({
      userId,
      action,
      resource,
      metadata,
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('User-Agent')
    })

    res.json({ success: true, message: 'User activity sent to Kafka' })
  } catch (error) {
    logger.error('Failed to send user activity:', error)
    res.status(500).json({ error: 'Failed to send user activity' })
  }
})

app.post('/api/produce/metric', async (req: Request, res: Response) => {
  try {
    const { metricName, value, unit, tags } = req.body
    
    if (!metricName || value === undefined) {
      return res.status(400).json({ error: 'metricName and value are required' })
    }

    await kafkaProducer.sendSystemMetric({
      metricName,
      value: parseFloat(value),
      unit,
      tags
    })

    res.json({ success: true, message: 'Metric sent to Kafka' })
  } catch (error) {
    logger.error('Failed to send metric:', error)
    res.status(500).json({ error: 'Failed to send metric' })
  }
})

// Statistics API
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const [
      messageCount,
      userActivityCount,
      metricCount,
      errorCount,
      topicCount
    ] = await Promise.all([
      prisma.message.count(),
      prisma.userActivity.count(),
      prisma.systemMetric.count(),
      prisma.errorLog.count(),
      prisma.topicStatus.count({ where: { isActive: true } })
    ])

    res.json({
      stats: {
        messages: messageCount,
        userActivities: userActivityCount,
        metrics: metricCount,
        errors: errorCount,
        activeTopics: topicCount
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to fetch stats:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', error)
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  })
})

// Server startup
async function startServer() {
  try {
    // Kafka Producer 연결
    await kafkaProducer.connect()
    logger.info('Kafka Producer connected')

    // 데이터베이스 연결 확인
    await prisma.$connect()
    logger.info('Database connected')

    const port = config.app.port
    app.listen(port, () => {
      logger.info(`API Server running on port ${port}`)
      logger.info(`Environment: ${config.app.env}`)
      logger.info(`Health check: http://localhost:${port}/health`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down API server...')
  await kafkaProducer.disconnect()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Shutting down API server...')
  await kafkaProducer.disconnect()
  await prisma.$disconnect()
  process.exit(0)
})

if (require.main === module) {
  startServer()
}

export default app
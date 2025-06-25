import { Request, Response, NextFunction } from 'express'
import { logger } from './logger'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitOptions {
  windowMs: number
  max: number
  message: string
  keyGenerator?: (req: Request) => string
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message, keyGenerator = (req) => req.ip } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req)
    const now = Date.now()
    const resetTime = now + windowMs

    let record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime }
      rateLimitStore.set(key, record)
    } else {
      record.count += 1
    }

    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count))
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString())

    if (record.count > max) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        count: record.count
      })

      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      })
    }

    next()
  }
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;&|`$]/g, '') // Remove command injection characters
    .trim()
    .slice(0, 1000) // Limit length
}

export function validateObjectId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function validateDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true
  
  if (startDate && isNaN(Date.parse(startDate))) return false
  if (endDate && isNaN(Date.parse(endDate))) return false
  
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year
    
    return start <= end && (end.getTime() - start.getTime()) <= maxRange
  }
  
  return true
}

export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block')
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "media-src 'self'; " +
      "frame-src 'none';"
    )
    
    // Remove server information
    res.removeHeader('X-Powered-By')
    
    next()
  }
}

export function requestLogging() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - startTime
      const logData = {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
      }
      
      if (res.statusCode >= 400) {
        logger.warn('HTTP Error', logData)
      } else {
        logger.info('HTTP Request', logData)
      }
    })
    
    next()
  }
}

export function errorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    res.status(500).json({
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString(),
      requestId: res.get('X-Request-ID')
    })
  }
}

export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = generateRequestId()
    res.setHeader('X-Request-ID', requestId)
    req.requestId = requestId
    next()
  }
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}
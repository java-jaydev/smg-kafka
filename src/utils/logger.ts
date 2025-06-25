import * as fs from 'fs'
import * as path from 'path'
import config from '../config'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

const logLevelMap: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: any
  requestId?: string
  service?: string
  environment: string
}

class Logger {
  private level: LogLevel
  private logDir: string
  private enableFileLogging: boolean

  constructor() {
    this.level = logLevelMap[config.app.logLevel] || LogLevel.INFO
    this.logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs'
    this.enableFileLogging = process.env.LOG_FILE_ENABLED === 'true'
    
    // Create logs directory if file logging is enabled
    if (this.enableFileLogging) {
      this.ensureLogDirectory()
    }
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
    } catch (error) {
      console.error('Failed to create log directory:', error)
      this.enableFileLogging = false
    }
  }

  private formatLogEntry(level: LogLevel, message: string, context?: any, requestId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      requestId,
      service: 'smg-kafka',
      environment: config.app.env
    }
  }

  private writeToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, context, requestId } = logEntry
    
    let logMessage = `[${timestamp}] [${level}]`
    
    if (requestId) {
      logMessage += ` [${requestId}]`
    }
    
    logMessage += ` ${message}`

    // Color coding for console output
    const colorMap: Record<string, string> = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m'  // White
    }
    
    const resetColor = '\x1b[0m'
    const color = colorMap[level] || ''
    
    console.log(`${color}${logMessage}${resetColor}`, context ? context : '')
  }

  private writeToFile(logEntry: LogEntry): void {
    if (!this.enableFileLogging) return

    try {
      const logFilePath = process.env.LOG_FILE_PATH || path.join(this.logDir, 'app.log')
      const logLine = JSON.stringify(logEntry) + '\n'
      
      fs.appendFileSync(logFilePath, logLine)
      
      // Rotate log file if it gets too large
      this.rotateLogIfNeeded(logFilePath)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private rotateLogIfNeeded(logFilePath: string): void {
    try {
      const stats = fs.statSync(logFilePath)
      const maxSize = parseInt(process.env.LOG_FILE_MAX_SIZE || '10485760', 10) // 10MB default
      
      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = `${logFilePath}.${timestamp}`
        
        fs.renameSync(logFilePath, rotatedPath)
        
        // Clean up old log files
        this.cleanupOldLogs()
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  private cleanupOldLogs(): void {
    try {
      const maxFiles = parseInt(process.env.LOG_FILE_MAX_FILES || '5', 10)
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('app.log.'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          time: fs.statSync(path.join(this.logDir, file)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime())

      // Remove excess files
      if (files.length > maxFiles) {
        files.slice(maxFiles).forEach(file => {
          fs.unlinkSync(file.path)
        })
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  private log(level: LogLevel, message: string, context?: any, requestId?: string): void {
    if (level <= this.level) {
      const logEntry = this.formatLogEntry(level, message, context, requestId)
      
      this.writeToConsole(logEntry)
      this.writeToFile(logEntry)
    }
  }

  error(message: string, context?: any, requestId?: string): void {
    this.log(LogLevel.ERROR, message, context, requestId)
  }

  warn(message: string, context?: any, requestId?: string): void {
    this.log(LogLevel.WARN, message, context, requestId)
  }

  info(message: string, context?: any, requestId?: string): void {
    this.log(LogLevel.INFO, message, context, requestId)
  }

  debug(message: string, context?: any, requestId?: string): void {
    this.log(LogLevel.DEBUG, message, context, requestId)
  }

  // Performance logging
  time(label: string): void {
    console.time(label)
  }

  timeEnd(label: string): void {
    console.timeEnd(label)
  }

  // Structured logging for specific events
  httpRequest(req: any, res: any, duration: number): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    }, req.requestId)
  }

  kafkaMessage(topic: string, partition: number, offset: string, action: 'produced' | 'consumed'): void {
    this.info(`Kafka message ${action}`, {
      topic,
      partition,
      offset,
      action
    })
  }

  databaseQuery(query: string, duration: number, error?: Error): void {
    if (error) {
      this.error('Database query failed', {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        error: error.message
      })
    } else {
      this.debug('Database query executed', {
        query: query.substring(0, 200),
        duration
      })
    }
  }

  securityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium'): void {
    this.warn(`Security event: ${event}`, {
      ...details,
      severity,
      securityEvent: true
    })
  }

  getLogLevel(): LogLevel {
    return this.level
  }

  setLogLevel(level: LogLevel): void {
    this.level = level
  }
}

export const logger = new Logger()
export default logger
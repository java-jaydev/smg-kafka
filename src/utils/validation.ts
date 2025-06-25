import { Request, Response, NextFunction } from 'express'
import { logger } from './logger'

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: string[]
  custom?: (value: any) => boolean | string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export class ValidationResult {
  constructor(
    public isValid: boolean,
    public errors: ValidationError[] = [],
    public data: any = null
  ) {}
}

export function validateSchema(data: any, schema: ValidationSchema): ValidationResult {
  const errors: ValidationError[] = []
  const validatedData: any = {}

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field]

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        value
      })
      continue
    }

    // Skip validation if field is not required and value is empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type validation
    if (rule.type && !validateType(value, rule.type)) {
      errors.push({
        field,
        message: `${field} must be of type ${rule.type}`,
        value
      })
      continue
    }

    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.minLength} characters long`,
          value
        })
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `${field} must not exceed ${rule.maxLength} characters`,
          value
        })
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          value
        })
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rule.enum.join(', ')}`,
          value
        })
      }
    }

    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`,
          value
        })
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          message: `${field} must not exceed ${rule.max}`,
          value
        })
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (customResult !== true) {
        errors.push({
          field,
          message: typeof customResult === 'string' ? customResult : `${field} is invalid`,
          value
        })
      }
    }

    // Add validated field to data
    if (errors.length === 0 || !errors.some(err => err.field === field)) {
      validatedData[field] = value
    }
  }

  return new ValidationResult(errors.length === 0, errors, validatedData)
}

function validateType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && !isNaN(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    default:
      return true
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
}

// Pre-defined validation schemas
export const CommonSchemas = {
  userActivity: {
    userId: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 255
    },
    action: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100
    },
    resource: {
      type: 'string' as const,
      maxLength: 255
    },
    metadata: {
      type: 'object' as const
    },
    ipAddress: {
      type: 'string' as const,
      pattern: ValidationPatterns.ipv4
    },
    userAgent: {
      type: 'string' as const,
      maxLength: 1000
    }
  },

  systemMetric: {
    metricName: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9_.-]+$/
    },
    value: {
      required: true,
      type: 'number' as const
    },
    unit: {
      type: 'string' as const,
      maxLength: 50
    },
    tags: {
      type: 'object' as const
    }
  },

  errorLog: {
    service: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100
    },
    errorType: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 100
    },
    message: {
      required: true,
      type: 'string' as const,
      minLength: 1,
      maxLength: 5000
    },
    stackTrace: {
      type: 'string' as const,
      maxLength: 10000
    },
    context: {
      type: 'object' as const
    },
    severity: {
      type: 'string' as const,
      enum: ['error', 'warning', 'critical']
    }
  },

  pagination: {
    limit: {
      type: 'number' as const,
      min: 1,
      max: 1000,
      custom: (value: any) => {
        const num = parseInt(value, 10)
        return !isNaN(num) && num > 0 && num <= 1000
      }
    },
    offset: {
      type: 'number' as const,
      min: 0,
      custom: (value: any) => {
        const num = parseInt(value, 10)
        return !isNaN(num) && num >= 0
      }
    },
    startDate: {
      type: 'string' as const,
      custom: (value: any) => {
        const date = new Date(value)
        return !isNaN(date.getTime())
      }
    },
    endDate: {
      type: 'string' as const,
      custom: (value: any) => {
        const date = new Date(value)
        return !isNaN(date.getTime())
      }
    }
  }
}

// Express middleware for validation
export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = {
      ...req.body,
      ...req.query,
      ...req.params
    }

    // Convert string numbers to actual numbers for query parameters
    for (const [key, value] of Object.entries(dataToValidate)) {
      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        dataToValidate[key] = Number(value)
      }
    }

    const result = validateSchema(dataToValidate, schema)

    if (!result.isValid) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: result.errors,
        data: dataToValidate
      })

      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors,
        timestamp: new Date().toISOString()
      })
    }

    // Add validated data to request
    req.validatedData = result.data
    next()
  }
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      validatedData?: any
    }
  }
}

// Utility functions
export function sanitizeObject(obj: any, allowedKeys: string[]): any {
  const sanitized: any = {}
  
  for (const key of allowedKeys) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = obj[key]
    }
  }
  
  return sanitized
}

export function validateDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate && !endDate) return true
  
  try {
    if (startDate) {
      const start = new Date(startDate)
      if (isNaN(start.getTime())) return false
    }
    
    if (endDate) {
      const end = new Date(endDate)
      if (isNaN(end.getTime())) return false
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year max range
      
      return start <= end && (end.getTime() - start.getTime()) <= maxRange
    }
    
    return true
  } catch {
    return false
  }
}
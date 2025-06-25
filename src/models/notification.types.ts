export interface Notification {
  id: string
  type: NotificationType
  message: string
  recipients?: string[]
  metadata?: NotificationMetadata
  timestamp: Date
  sent: boolean
  sentAt?: Date | null
  deliveryStatus?: DeliveryStatus
  createdAt: Date
}

export interface NotificationInput {
  type: NotificationType
  message: string
  recipients?: string[]
  metadata?: NotificationMetadata
  timestamp?: Date
}

export type NotificationType = 
  | 'system_alert'
  | 'error_notification'
  | 'metric_threshold'
  | 'user_activity'
  | 'maintenance'
  | 'security_alert'
  | 'performance_warning'

export type DeliveryStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'

export interface NotificationMetadata {
  alertLevel?: 'info' | 'warning' | 'error' | 'critical'
  threshold?: number
  currentValue?: number
  service?: string
  endpoint?: string
  userId?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  tags?: string[]
  [key: string]: any
}

export interface EmailNotification {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  isHtml?: boolean
  attachments?: EmailAttachment[]
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface SlackNotification {
  webhookUrl: string
  channel?: string
  username?: string
  iconEmoji?: string
  text: string
  blocks?: any[]
  attachments?: any[]
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms'
  config: EmailConfig | SlackConfig | WebhookConfig | SmsConfig
  enabled: boolean
}

export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  from: string
  tls?: boolean
}

export interface SlackConfig {
  webhookUrl: string
  defaultChannel?: string
  username?: string
  iconEmoji?: string
}

export interface WebhookConfig {
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  timeout?: number
}

export interface SmsConfig {
  provider: string
  apiKey: string
  from: string
}
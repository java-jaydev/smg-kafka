export interface KafkaMessage {
  id: string
  topic: string
  partition: number
  offset: string
  key: string | null
  value: any
  headers?: Record<string, string | null>
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

export interface KafkaMessageInput {
  topic: string
  partition: number
  offset: string
  key?: string | null
  value: any
  headers?: Record<string, string | null>
  timestamp?: Date
}

export interface MessageQueryParams {
  topic?: string
  limit?: string
  offset?: string
  startDate?: string
  endDate?: string
}

export interface MessageResponse {
  data: KafkaMessage[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface KafkaMessageHeaders {
  'content-type'?: string
  'producer-id'?: string
  'created-at'?: string
  [key: string]: string | undefined
}
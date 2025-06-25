export interface UserActivity {
  id: string
  userId: string
  action: string
  resource?: string | null
  metadata?: any
  ipAddress?: string | null
  userAgent?: string | null
  timestamp: Date
  createdAt: Date
}

export interface UserActivityInput {
  userId: string
  action: string
  resource?: string
  metadata?: any
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export interface UserActivityQueryParams {
  userId?: string
  action?: string
  limit?: string
  offset?: string
  startDate?: string
  endDate?: string
}

export interface UserActivityResponse {
  data: UserActivity[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type UserActionType = 
  | 'login'
  | 'logout'
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'download'
  | 'upload'
  | 'search'
  | 'click'
  | 'navigate'
  | 'error'

export interface UserActivityMetadata {
  browser?: string
  version?: string
  device?: string
  screen?: {
    width: number
    height: number
  }
  referrer?: string
  sessionId?: string
  duration?: number
  [key: string]: any
}
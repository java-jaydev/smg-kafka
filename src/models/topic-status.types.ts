export interface TopicStatus {
  id: string
  topicName: string
  partitionCount: number
  replicationFactor: number
  isActive: boolean
  lastMessageAt?: Date | null
  messageCount: bigint
  createdAt: Date
  updatedAt: Date
}

export interface TopicStatusInput {
  topicName: string
  partitionCount?: number
  replicationFactor?: number
  isActive?: boolean
  lastMessageAt?: Date
  messageCount?: bigint
}

export interface TopicStatusResponse {
  data: TopicStatus[]
}

export interface TopicInfo {
  name: string
  partitions: number
  replicationFactor: number
  configs: Record<string, string>
}

export interface KafkaTopicMetadata {
  topicName: string
  partitions: PartitionMetadata[]
  configs: TopicConfig[]
}

export interface PartitionMetadata {
  partitionId: number
  leader: number
  replicas: number[]
  isr: number[]
  offline: boolean
}

export interface TopicConfig {
  name: string
  value: string
  source: string
  isDefault: boolean
  isSensitive: boolean
}

export interface ConsumerGroupInfo {
  groupId: string
  state: string
  members: GroupMember[]
  coordinator: Coordinator
}

export interface GroupMember {
  memberId: string
  clientId: string
  clientHost: string
  assignment: PartitionAssignment[]
}

export interface PartitionAssignment {
  topic: string
  partitions: number[]
}

export interface Coordinator {
  nodeId: number
  host: string
  port: number
}
# Kafka 사용 가이드

SMG Kafka 프로젝트에서 Apache Kafka를 사용하는 방법을 설명합니다.

## 📋 개요

이 프로젝트는 다음 Kafka 토픽들을 사용합니다:

| 토픽명 | 설명 | 파티션 수 | 보존 기간 |
|--------|------|-----------|-----------|
| `user-activities` | 사용자 활동 로그 | 3 | 7일 |
| `system-metrics` | 시스템 메트릭 | 3 | 7일 |
| `error-logs` | 에러 로그 | 3 | 7일 |
| `notifications` | 알림 메시지 | 3 | 7일 |

## 🔧 Kafka 클러스터 관리

### Kafka Manager 사용

Kafka Manager는 웹 기반 Kafka 관리 도구입니다.

**접속**: http://localhost:9000

**주요 기능:**
- 클러스터 상태 모니터링
- 토픽 생성/삭제/수정
- 컨슈머 그룹 관리
- 파티션 및 오프셋 정보 확인

### 커맨드 라인 도구

**Kafka 컨테이너 접속:**
```bash
docker exec -it smg-kafka bash
```

**토픽 목록 조회:**
```bash
kafka-topics --bootstrap-server localhost:9092 --list
```

**토픽 상세 정보 조회:**
```bash
kafka-topics --bootstrap-server localhost:9092 --describe --topic user-activities
```

**토픽 생성:**
```bash
kafka-topics --bootstrap-server localhost:9092 \\
  --create --topic new-topic \\
  --partitions 3 \\
  --replication-factor 1
```

**토픽 삭제:**
```bash
kafka-topics --bootstrap-server localhost:9092 --delete --topic topic-name
```

## 📨 Producer 사용법

### 기본 사용법

```typescript
import { KafkaProducer } from './src/producer'

const producer = new KafkaProducer()

// 연결
await producer.connect()

// 사용자 활동 전송
await producer.sendUserActivity({
  userId: 'user-001',
  action: 'login',
  resource: '/dashboard',
  metadata: { browser: 'Chrome' },
  ipAddress: '192.168.1.100'
})

// 시스템 메트릭 전송
await producer.sendSystemMetric({
  metricName: 'cpu_usage',
  value: 75.5,
  unit: 'percentage',
  tags: { server: 'web-01' }
})

// 에러 로그 전송
await producer.sendErrorLog({
  service: 'api',
  errorType: 'DatabaseError',
  message: 'Connection timeout',
  severity: 'error',
  context: { attempt: 3 }
})

// 알림 전송
await producer.sendNotification({
  type: 'system_alert',
  message: 'High CPU usage detected',
  recipients: ['admin@company.com']
})

// 연결 해제
await producer.disconnect()
```

### 고급 Producer 설정

```typescript
import { kafka } from './src/config/kafka'

const producer = kafka.producer({
  // 최대 진행 중인 요청 수 (순서 보장을 위해 1로 설정)
  maxInFlightRequests: 1,
  
  // 멱등성 보장
  idempotent: true,
  
  // 배치 설정
  batchSize: 16384,
  lingerMs: 10,
  
  // 압축 설정
  compression: 'gzip',
  
  // 재시도 설정
  retry: {
    initialRetryTime: 100,
    retries: 5
  }
})
```

### 커맨드 라인에서 메시지 전송

```bash
# 사용자 활동 메시지 전송
echo '{\"userId\":\"test-user\",\"action\":\"login\"}' | \\
kafka-console-producer --bootstrap-server localhost:9092 --topic user-activities

# 시스템 메트릭 메시지 전송
echo '{\"metricName\":\"cpu_usage\",\"value\":85.2}' | \\
kafka-console-producer --bootstrap-server localhost:9092 --topic system-metrics
```

## 📥 Consumer 사용법

### 기본 사용법

```typescript
import { KafkaConsumer } from './src/consumer'

const consumer = new KafkaConsumer()

// 연결 및 구독
await consumer.connect()
await consumer.subscribe()

// 메시지 소비 시작
await consumer.startConsuming()

// Graceful shutdown
process.on('SIGINT', async () => {
  await consumer.disconnect()
})
```

### Consumer Group 관리

**Consumer Group 정보 조회:**
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

**특정 Group 상세 정보:**
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \\
  --describe --group smg-kafka-group
```

**Consumer Group 오프셋 리셋:**
```bash
# 최신 오프셋으로 리셋
kafka-consumer-groups --bootstrap-server localhost:9092 \\
  --group smg-kafka-group --reset-offsets --to-latest \\
  --topic user-activities --execute

# 특정 오프셋으로 리셋
kafka-consumer-groups --bootstrap-server localhost:9092 \\
  --group smg-kafka-group --reset-offsets --to-offset 1000 \\
  --topic user-activities --execute
```

### 커맨드 라인에서 메시지 소비

```bash
# 특정 토픽의 메시지 소비 (처음부터)
kafka-console-consumer --bootstrap-server localhost:9092 \\
  --topic user-activities --from-beginning

# 특정 토픽의 메시지 소비 (실시간)
kafka-console-consumer --bootstrap-server localhost:9092 \\
  --topic user-activities

# Consumer Group과 함께 소비
kafka-console-consumer --bootstrap-server localhost:9092 \\
  --topic user-activities --group test-group
```

## 🔍 모니터링 및 디버깅

### 메시지 확인

**토픽의 메시지 수 확인:**
```bash
kafka-run-class kafka.tools.GetOffsetShell \\
  --broker-list localhost:9092 --topic user-activities
```

**파티션별 오프셋 정보:**
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 \\
  --describe --group smg-kafka-group
```

### 성능 측정

**Producer 성능 테스트:**
```bash
kafka-producer-perf-test --topic user-activities \\
  --num-records 10000 --record-size 1000 \\
  --throughput 1000 --producer-props bootstrap.servers=localhost:9092
```

**Consumer 성능 테스트:**
```bash
kafka-consumer-perf-test --topic user-activities \\
  --messages 10000 --threads 1 \\
  --bootstrap-server localhost:9092
```

### 로그 수준 변경

```bash
# Kafka 로그 수준 변경
kafka-log-dirs --bootstrap-server localhost:9092 --describe
```

## 🚨 에러 처리 및 복구

### 일반적인 문제들

**1. 토픽이 자동 생성되지 않는 경우:**
```bash
# 토픽 자동 생성 설정 확인
kafka-configs --bootstrap-server localhost:9092 \\
  --entity-type brokers --entity-name 1 --describe
```

**2. 메시지 중복 처리:**
```typescript
// Producer에서 멱등성 설정
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
  acks: 'all'
})

// Consumer에서 수동 오프셋 커밋
const consumer = kafka.consumer({
  groupId: 'my-group',
  enableAutoCommit: false
})

// 메시지 처리 후 수동 커밋
await consumer.commitOffsets([{
  topic: 'user-activities',
  partition: 0,
  offset: '12345'
}])
```

**3. 메시지 순서 보장:**
```typescript
// 같은 키를 가진 메시지는 같은 파티션으로 전송
await producer.send({
  topic: 'user-activities',
  messages: [{
    key: 'user-001',  // 파티션 결정에 사용
    value: JSON.stringify(userData)
  }]
})
```

### 백업 및 복구

**토픽 백업:**
```bash
# 메시지를 파일로 덤프
kafka-console-consumer --bootstrap-server localhost:9092 \\
  --topic user-activities --from-beginning \\
  --max-messages 10000 > backup.json
```

**토픽 복구:**
```bash
# 파일에서 메시지 복구
kafka-console-producer --bootstrap-server localhost:9092 \\
  --topic user-activities < backup.json
```

## ⚡ 성능 최적화

### Producer 최적화

```typescript
const producer = kafka.producer({
  // 배치 크기 증가 (기본: 16384)
  batchSize: 65536,
  
  // 링거 시간 증가 (기본: 0)
  lingerMs: 50,
  
  // 압축 활성화
  compression: 'gzip',
  
  // 메모리 버퍼 크기
  bufferMemory: 67108864,  // 64MB
  
  // 최대 요청 크기
  maxRequestSize: 1048576   // 1MB
})
```

### Consumer 최적화

```typescript
const consumer = kafka.consumer({
  groupId: 'high-throughput-group',
  
  // 세션 타임아웃 증가
  sessionTimeout: 45000,
  
  // 하트비트 간격
  heartbeatInterval: 3000,
  
  // 파티션당 최대 바이트
  maxBytesPerPartition: 2097152,  // 2MB
  
  // 최대 대기 시간
  maxWaitTimeInMs: 5000
})
```

### 파티션 전략

**파티션 수 결정:**
- 처리량 요구사항 기반: `목표 처리량 / 파티션당 처리량`
- Consumer 병렬성: Consumer 수 = 파티션 수
- 일반적으로 3-6개 파티션으로 시작

**키 기반 파티셔닝:**
```typescript
// 사용자 ID로 파티셔닝
await producer.send({
  topic: 'user-activities',
  messages: [{
    key: userData.userId,  // 같은 사용자 = 같은 파티션
    value: JSON.stringify(userData)
  }]
})
```

## 🔐 보안 설정

### SASL 인증 설정 (필요시)

```typescript
const kafka = new Kafka({
  brokers: ['localhost:9092'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: 'kafka-user',
    password: 'kafka-password'
  }
})
```

### ACL 설정

```bash
# Producer ACL
kafka-acls --bootstrap-server localhost:9092 \\
  --add --allow-principal User:producer-user \\
  --operation Write --topic user-activities

# Consumer ACL
kafka-acls --bootstrap-server localhost:9092 \\
  --add --allow-principal User:consumer-user \\
  --operation Read --topic user-activities \\
  --group smg-kafka-group
```

## 📊 메트릭 수집

### JMX 메트릭 활성화

Docker Compose에서 이미 JMX가 활성화되어 있습니다:

```yaml
environment:
  KAFKA_JMX_PORT: 9101
  KAFKA_JMX_HOSTNAME: localhost
```

### 주요 메트릭

**Producer 메트릭:**
- `kafka.producer:type=producer-metrics,client-id=*`
- `record-send-rate`: 초당 전송 레코드 수
- `batch-size-avg`: 평균 배치 크기

**Consumer 메트릭:**
- `kafka.consumer:type=consumer-metrics,client-id=*`
- `records-consumed-rate`: 초당 소비 레코드 수
- `fetch-latency-avg`: 평균 페치 지연시간

**Broker 메트릭:**
- `kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec`
- `kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec`

## 🛠️ 개발 팁

### 로컬 개발 환경

```bash
# 개발용 메시지 생성 스크립트
node -e \"
const producer = require('./dist/producer').default;
const p = new producer();
p.connect().then(() => {
  for(let i = 0; i < 100; i++) {
    p.sendUserActivity({
      userId: 'dev-user-' + i,
      action: 'test-action',
      resource: '/test'
    });
  }
  p.disconnect();
});
\"
```

### 메시지 스키마 검증

```typescript
// JSON Schema를 사용한 메시지 검증
import Ajv from 'ajv'

const ajv = new Ajv()
const userActivitySchema = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    action: { type: 'string' },
    timestamp: { type: 'string' }
  },
  required: ['userId', 'action']
}

const validate = ajv.compile(userActivitySchema)

// 메시지 전송 전 검증
if (validate(messageData)) {
  await producer.send(message)
} else {
  console.error('Invalid message:', validate.errors)
}
```

### 테스트 환경 설정

```typescript
// 테스트용 메모리 내 Kafka (TestContainers 사용)
import { KafkaContainer } from 'testcontainers'

describe('Kafka Integration Tests', () => {
  let kafka: KafkaContainer

  beforeAll(async () => {
    kafka = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
      .withExposedPorts(9093)
      .start()
  })

  afterAll(async () => {
    await kafka.stop()
  })

  test('should send and receive messages', async () => {
    // 테스트 코드
  })
})
```
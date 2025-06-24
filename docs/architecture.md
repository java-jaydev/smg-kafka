# 시스템 아키텍처

SMG Kafka 프로젝트의 전체 시스템 아키텍처를 설명합니다.

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SMG Kafka 데이터 파이프라인                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   외부 앱    │───▶│  Producer   │───▶│    Kafka    │───▶│  Consumer   │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                           │                                      │
                           ▼                                      ▼
┌─────────────┐    ┌─────────────┐                    ┌─────────────┐
│   클라이언트  │◀───│  REST API   │                    │ PostgreSQL  │
│             │    │             │                    │             │
└─────────────┘    └─────────────┘                    └─────────────┘
                           ▲                                      ▲
                           └──────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐
│Kafka Manager│    │   Adminer   │
│             │    │             │
└─────────────┘    └─────────────┘
```

## 🔧 컴포넌트 구성

### 1. 메시지 브로커 계층

#### Apache Kafka
- **역할**: 중앙 메시지 브로커
- **포트**: 9092 (외부), 29092 (내부)
- **파티션**: 토픽당 3개 파티션
- **복제 팩터**: 1 (단일 브로커 환경)

#### Apache Zookeeper
- **역할**: Kafka 클러스터 코디네이션
- **포트**: 2181
- **상태**: 단일 인스턴스

### 2. 데이터 처리 계층

#### Producer (Node.js)
```typescript
┌─────────────────────────────────────┐
│            Producer                 │
├─────────────────────────────────────┤
│ • KafkaJS 클라이언트               │
│ • 메시지 발행 API                  │
│ • 토픽별 메시지 라우팅             │
│ • 에러 처리 및 재시도              │
│ • 메시지 순서 보장                 │
└─────────────────────────────────────┘
```

**주요 기능:**
- 사용자 활동 로그 수집
- 시스템 메트릭 수집
- 에러 로그 수집
- 알림 메시지 발행

#### Consumer (Node.js)
```typescript
┌─────────────────────────────────────┐
│            Consumer                 │
├─────────────────────────────────────┤
│ • KafkaJS 클라이언트               │
│ • 메시지 소비 및 처리              │
│ • 데이터베이스 저장                │
│ • 오프셋 관리                      │
│ • 데드 레터 큐 처리                │
└─────────────────────────────────────┘
```

**주요 기능:**
- 실시간 메시지 소비
- 데이터 변환 및 정제
- PostgreSQL 저장
- 에러 복구 및 재처리

### 3. 데이터 저장 계층

#### PostgreSQL
```sql
┌─────────────────────────────────────┐
│          PostgreSQL                 │
├─────────────────────────────────────┤
│ • messages (원본 메시지)           │
│ • user_activities (사용자 활동)    │
│ • system_metrics (시스템 메트릭)   │
│ • error_logs (에러 로그)           │
│ • topic_status (토픽 상태)         │
└─────────────────────────────────────┘
```

**스키마 설계:**
- UUID 기반 Primary Key
- JSON 타입으로 유연한 데이터 저장
- 인덱스 최적화 (timestamp, topic 등)
- 파티션 정보 저장

### 4. API 서비스 계층

#### REST API (Express.js)
```typescript
┌─────────────────────────────────────┐
│            REST API                 │
├─────────────────────────────────────┤
│ • Express.js 웹 프레임워크         │
│ • Prisma ORM                       │
│ • 데이터 조회 엔드포인트           │
│ • 메시지 발행 엔드포인트           │
│ • 통계 및 모니터링 API             │
└─────────────────────────────────────┘
```

**엔드포인트 구조:**
```
/health                    # 상태 확인
/api/messages             # 메시지 조회
/api/user-activities      # 사용자 활동 조회
/api/metrics              # 메트릭 조회
/api/errors               # 에러 로그 조회
/api/topics               # 토픽 상태 조회
/api/stats                # 전체 통계
/api/produce/*            # 메시지 발행
```

### 5. 모니터링 계층

#### Kafka Manager
- **역할**: Kafka 클러스터 모니터링
- **포트**: 9000
- **기능**: 토픽, 파티션, 컨슈머 그룹 관리

#### Adminer
- **역할**: 데이터베이스 관리
- **포트**: 8080
- **기능**: SQL 쿼리, 데이터 브라우징

## 📊 데이터 흐름

### 1. 메시지 발행 흐름

```
클라이언트 요청
    │
    ▼
REST API 엔드포인트
    │
    ▼
Producer 클래스
    │
    ▼
KafkaJS Producer
    │
    ▼
Kafka Topic (파티션별 분산)
    │
    ▼
메시지 저장 (파티션 로그)
```

### 2. 메시지 소비 흐름

```
Kafka Topic 폴링
    │
    ▼
KafkaJS Consumer
    │
    ▼
Consumer 클래스 (메시지 처리)
    │
    ▼
데이터 변환 및 검증
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL 저장
    │
    ▼
오프셋 커밋
```

### 3. 데이터 조회 흐름

```
클라이언트 요청
    │
    ▼
REST API 엔드포인트
    │
    ▼
Prisma ORM 쿼리
    │
    ▼
PostgreSQL 조회
    │
    ▼
JSON 응답 반환
```

## 🔄 메시지 라이프사이클

### 1. 메시지 생성
```typescript
// Producer에서 메시지 생성
const message = {
  topic: 'user-activities',
  key: userId,
  value: JSON.stringify({
    userId,
    action,
    timestamp: new Date().toISOString(),
    metadata: { ... }
  }),
  headers: {
    'content-type': 'application/json',
    'producer-id': 'smg-kafka-producer'
  }
}
```

### 2. 메시지 파티셔닝
```
Key Hash → Partition Assignment
user-001 → Partition 0
user-002 → Partition 1
user-003 → Partition 2
```

### 3. 메시지 저장
```
Kafka Log Structure:
/var/lib/kafka/data/user-activities-0/
├── 00000000000000000000.log
├── 00000000000000000000.index
└── 00000000000000000000.timeindex
```

### 4. 메시지 소비
```typescript
// Consumer에서 메시지 소비
consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    // 메시지 처리 로직
    await processMessage(topic, message)
    // 데이터베이스 저장
    await saveToDatabase(message)
  }
})
```

## 🏗️ 스케일링 전략

### 수평적 확장

#### Kafka 브로커 확장
```yaml
# docker-compose.yml 확장 예시
kafka-1:
  image: confluentinc/cp-kafka:7.4.0
  environment:
    KAFKA_BROKER_ID: 1
    # ... 기타 설정

kafka-2:
  image: confluentinc/cp-kafka:7.4.0
  environment:
    KAFKA_BROKER_ID: 2
    # ... 기타 설정
```

#### Consumer 인스턴스 확장
```bash
# 여러 Consumer 인스턴스 실행
pnpm run start:consumer &  # Consumer 1
pnpm run start:consumer &  # Consumer 2
pnpm run start:consumer &  # Consumer 3
```

#### 파티션 확장
```bash
# 파티션 수 증가
kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic user-activities --partitions 6
```

### 수직적 확장

#### 리소스 최적화
```typescript
// Producer 성능 튜닝
const producer = kafka.producer({
  batchSize: 65536,      // 배치 크기 증가
  lingerMs: 50,          // 배치 대기 시간
  compression: 'gzip',   // 압축 활성화
  maxInFlightRequests: 5 // 동시 요청 수 증가
})

// Consumer 성능 튜닝
const consumer = kafka.consumer({
  maxBytesPerPartition: 2097152, // 2MB
  maxWaitTimeInMs: 1000,         // 대기 시간 단축
  sessionTimeout: 45000          // 세션 타임아웃 증가
})
```

## 🔒 보안 아키텍처

### 네트워크 보안
```
외부 네트워크
    │
    ▼ (HTTPS/TLS)
API Gateway / Load Balancer
    │
    ▼ (Internal Network)
SMG Kafka Network
    │
    ├─ Kafka (9092)
    ├─ PostgreSQL (5432)
    └─ API Server (3000)
```

### 인증 및 권한
```typescript
// 향후 구현 예정
interface SecurityConfig {
  kafka: {
    sasl: {
      mechanism: 'PLAIN' | 'SCRAM-SHA-256'
      username: string
      password: string
    }
    ssl: boolean
  }
  api: {
    jwt: {
      secret: string
      expiration: string
    }
    rateLimit: {
      windowMs: number
      max: number
    }
  }
}
```

## 📈 성능 특성

### 처리량 목표
- **Producer**: 10,000 messages/sec
- **Consumer**: 10,000 messages/sec
- **API**: 1,000 requests/sec
- **Latency**: < 100ms (end-to-end)

### 리소스 요구사항
```yaml
최소 요구사항:
  CPU: 2 cores
  Memory: 4GB RAM
  Storage: 20GB SSD

권장 사양:
  CPU: 4+ cores
  Memory: 8GB+ RAM
  Storage: 100GB+ SSD
  Network: 1Gbps
```

## 🔄 장애 복구

### 장애 시나리오 및 대응

#### Kafka 브로커 장애
```
장애 발생
    │
    ▼
Producer/Consumer 재연결 시도
    │
    ▼
백업 브로커로 자동 전환
    │
    ▼
메시지 복제를 통한 데이터 보존
```

#### 데이터베이스 장애
```
장애 발생
    │
    ▼
Consumer 메시지 처리 중단
    │
    ▼
Kafka에 메시지 보존 (7일)
    │
    ▼
데이터베이스 복구 후 재처리
```

#### API 서버 장애
```
장애 발생
    │
    ▼
Load Balancer 건강 체크 실패
    │
    ▼
트래픽을 다른 인스턴스로 라우팅
    │
    ▼
Auto-scaling으로 새 인스턴스 생성
```

## 🔧 개발 환경 vs 프로덕션 환경

### 개발 환경
```yaml
특징:
  - 단일 노드 구성
  - 데이터 보존 기간: 1시간
  - 로그 레벨: DEBUG
  - 모니터링 도구 활성화

설정:
  KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
  LOG_LEVEL: debug
  KAFKA_LOG_RETENTION_HOURS: 1
```

### 프로덕션 환경
```yaml
특징:
  - 다중 노드 구성 (최소 3대)
  - 데이터 보존 기간: 7일
  - 로그 레벨: INFO
  - 보안 강화

설정:
  KAFKA_AUTO_CREATE_TOPICS_ENABLE: false
  LOG_LEVEL: info
  KAFKA_LOG_RETENTION_HOURS: 168
  SECURITY_ENABLED: true
```

## 📊 모니터링 및 알림

### 핵심 메트릭
```typescript
interface SystemMetrics {
  kafka: {
    messageRate: number        // 초당 메시지 수
    consumerLag: number       // Consumer 지연
    diskUsage: number         // 디스크 사용률
    partitionCount: number    // 파티션 수
  }
  
  database: {
    connectionCount: number   // 연결 수
    queryLatency: number     // 쿼리 지연시간
    storageUsage: number     // 저장소 사용률
  }
  
  api: {
    requestRate: number      // 초당 요청 수
    responseTime: number     // 응답 시간
    errorRate: number        // 에러율
  }
}
```

### 알림 규칙
```yaml
alerts:
  - name: HighConsumerLag
    condition: consumer_lag > 10000
    severity: warning
    
  - name: KafkaBrokerDown
    condition: kafka_broker_up == 0
    severity: critical
    
  - name: DatabaseConnectionFailure
    condition: db_connection_errors > 10
    severity: critical
    
  - name: HighAPIErrorRate
    condition: api_error_rate > 5%
    severity: warning
```

이 아키텍처는 확장 가능하고 안정적인 실시간 데이터 처리를 위해 설계되었으며, 필요에 따라 각 컴포넌트를 독립적으로 확장할 수 있습니다.
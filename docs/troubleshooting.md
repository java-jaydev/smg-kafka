# SMG Kafka 문제 해결 가이드

## 🚨 일반적인 문제 해결

### 1. 애플리케이션 시작 실패

#### 문제: 포트가 이미 사용 중
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**해결 방법:**
```bash
# 포트를 사용하는 프로세스 확인
lsof -ti:3000

# 프로세스 종료
kill -9 $(lsof -ti:3000)

# 또는 다른 포트 사용
export API_PORT=3001
```

#### 문제: 환경 변수 누락
```bash
Error: Environment variable DATABASE_URL is required
```

**해결 방법:**
```bash
# .env 파일 생성 및 설정
cp .env.example .env
# .env 파일에서 필요한 변수들 설정

# 환경 변수 직접 설정
export DATABASE_URL="postgresql://smguser:smgpassword@localhost:5432/smg_kafka"
```

### 2. 데이터베이스 연결 문제

#### 문제: PostgreSQL 연결 실패
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결 방법:**
```bash
# Docker 컨테이너 상태 확인
docker-compose ps postgres

# PostgreSQL 서비스 시작
docker-compose up -d postgres

# 데이터베이스 연결 테스트
docker-compose exec postgres pg_isready -U smguser

# 수동 연결 테스트
psql -h localhost -p 5432 -U smguser -d smg_kafka
```

#### 문제: Prisma 마이그레이션 실패
```bash
Error: P1001: Can't reach database server
```

**해결 방법:**
```bash
# 데이터베이스 서버 상태 확인
docker-compose logs postgres

# 마이그레이션 다시 실행
pnpm run prisma:migrate reset
pnpm run prisma:migrate dev

# Prisma 클라이언트 재생성
pnpm run prisma:generate
```

### 3. Kafka 연결 문제

#### 문제: Kafka 브로커에 연결할 수 없음
```bash
Error: Failed to connect to Kafka: Connection timeout
```

**해결 방법:**
```bash
# Kafka 컨테이너 상태 확인
docker-compose ps kafka

# Kafka 로그 확인
docker-compose logs kafka

# Kafka 브로커 상태 테스트
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Zookeeper 상태 확인
docker-compose exec zookeeper zkCli.sh ls /brokers/ids
```

#### 문제: 토픽이 존재하지 않음
```bash
Error: Topic 'user-activities' does not exist
```

**해결 방법:**
```bash
# 토픽 목록 확인
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# 토픽 수동 생성
docker-compose exec kafka kafka-topics \
  --create --bootstrap-server localhost:9092 \
  --topic user-activities \
  --partitions 3 \
  --replication-factor 1

# Producer에서 토픽 자동 생성
pnpm run dev:producer
```

### 4. 메모리 관련 문제

#### 문제: Node.js 힙 메모리 부족
```bash
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**해결 방법:**
```bash
# Node.js 메모리 한계 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# 또는 package.json 스크립트 수정
"scripts": {
  "start": "node --max-old-space-size=4096 dist/api/index.js"
}

# Docker에서 메모리 제한 증가
docker run --memory=2g smg-kafka
```

#### 문제: Docker 컨테이너 메모리 부족
```bash
Error: Cannot allocate memory
```

**해결 방법:**
```bash
# Docker 메모리 사용량 확인
docker stats

# 컨테이너 메모리 제한 증가 (docker-compose.yml)
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

## 🔧 성능 문제 해결

### 1. 느린 API 응답

#### 문제 진단
```bash
# API 응답 시간 측정
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/messages"

# curl-format.txt 내용:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n
```

#### 해결 방법
```sql
-- 느린 쿼리 확인
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 인덱스 추가
CREATE INDEX CONCURRENTLY idx_messages_topic_timestamp 
ON messages(topic, timestamp DESC);

-- 쿼리 최적화
EXPLAIN ANALYZE SELECT * FROM messages 
WHERE topic = 'user-activities' 
ORDER BY timestamp DESC 
LIMIT 100;
```

### 2. Kafka 처리 지연

#### 문제 진단
```bash
# 컨슈머 그룹 지연 확인
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group smg-kafka-group

# 토픽 파티션 상태 확인
docker-compose exec kafka kafka-topics \
  --describe --bootstrap-server localhost:9092 \
  --topic user-activities
```

#### 해결 방법
```bash
# 컨슈머 인스턴스 수 증가
docker-compose up -d --scale consumer=3

# 파티션 수 증가
docker-compose exec kafka kafka-topics \
  --alter --bootstrap-server localhost:9092 \
  --topic user-activities --partitions 6

# 배치 사이즈 조정 (config/kafka.ts)
export const consumerConfig = {
  maxBytesPerPartition: 1048576 * 2, // 2MB
  sessionTimeout: 60000
}
```

## 🐛 오류 로그 분석

### 1. 애플리케이션 로그 확인

```bash
# Docker 컨테이너 로그
docker-compose logs -f app
docker-compose logs -f producer
docker-compose logs -f consumer

# 특정 시간대 로그
docker-compose logs --since="2024-01-15T10:00:00" app

# 로그 파일 직접 확인 (프로덕션)
tail -f /app/logs/app.log
```

### 2. 데이터베이스 로그 확인

```bash
# PostgreSQL 로그 확인
docker-compose logs postgres

# 느린 쿼리 로그 활성화
docker-compose exec postgres psql -U smguser -d smg_kafka -c "
  ALTER SYSTEM SET log_min_duration_statement = 1000;
  SELECT pg_reload_conf();
"

# 로그 분석
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log
```

### 3. Kafka 로그 확인

```bash
# Kafka 브로커 로그
docker-compose logs kafka

# 특정 토픽 로그 확인
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-activities \
  --from-beginning --max-messages 10
```

## 🔍 디버깅 도구

### 1. Health Check 상세 정보

```bash
# API Health Check
curl -v http://localhost:3000/health

# 데이터베이스 연결 확인
curl http://localhost:3000/api/stats

# Kafka 연결 상태 확인
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### 2. 시스템 리소스 모니터링

```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 시스템 리소스 확인
htop
df -h
free -h

# 네트워크 연결 확인
netstat -tlnp | grep :3000
ss -tlnp | grep :9092
```

### 3. 데이터베이스 디버깅

```sql
-- 활성 연결 확인
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE state = 'active';

-- 잠금 확인
SELECT l.pid, l.mode, l.granted, r.relname
FROM pg_locks l
JOIN pg_class r ON l.relation = r.oid
WHERE NOT l.granted;

-- 테이블 크기 확인
SELECT relname, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class
WHERE relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC;
```

## 🚨 응급상황 대처

### 1. 서비스 완전 중단

```bash
# 모든 서비스 강제 종료
docker-compose down --remove-orphans

# 데이터 볼륨 확인
docker volume ls

# 서비스 재시작
docker-compose up -d

# 단계별 서비스 시작
docker-compose up -d postgres
sleep 30
docker-compose up -d kafka
sleep 30
docker-compose up -d app
```

### 2. 데이터베이스 복구

```bash
# 백업에서 복구
docker-compose down
docker volume rm smg-kafka_postgres-data
docker-compose up -d postgres
sleep 30

# 백업 복원
cat backup.sql | docker-compose exec -T postgres psql -U smguser -d smg_kafka

# 마이그레이션 실행
pnpm run prisma:migrate deploy
```

### 3. Kafka 데이터 복구

```bash
# Kafka 데이터 디렉토리 확인
docker-compose exec kafka ls -la /var/lib/kafka/data

# 토픽 재생성
docker-compose exec kafka kafka-topics \
  --create --bootstrap-server localhost:9092 \
  --topic user-activities \
  --partitions 3 \
  --replication-factor 1

# 오프셋 리셋 (주의: 데이터 손실 가능)
docker-compose exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group smg-kafka-group \
  --reset-offsets --to-earliest \
  --topic user-activities --execute
```

## 📊 모니터링 및 알림

### 1. 프로메테우스 메트릭 확인

```bash
# 메트릭 엔드포인트 확인
curl http://localhost:3000/metrics

# 특정 메트릭 조회
curl -s http://localhost:3000/metrics | grep http_requests_total
```

### 2. 로그 기반 알림 설정

```bash
# Logrotate 설정
cat > /etc/logrotate.d/smg-kafka << EOF
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 3. 시스템 알림 스크립트

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/health"
SLACK_WEBHOOK="YOUR_SLACK_WEBHOOK_URL"

if ! curl -f "$HEALTH_URL" > /dev/null 2>&1; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 SMG Kafka API is down!"}' \
        "$SLACK_WEBHOOK"
fi
```

## 🔧 설정 최적화

### 1. Node.js 최적화

```javascript
// PM2 설정 (ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'smg-kafka-api',
    script: 'dist/api/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### 2. PostgreSQL 최적화

```sql
-- postgresql.conf 최적화 설정
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 3. Kafka 최적화

```properties
# server.properties
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000
compression.type=lz4
```

## 📞 지원 및 도움

### 1. 로그 수집 및 제출

```bash
# 진단 정보 수집 스크립트
#!/bin/bash
echo "=== SMG Kafka 진단 정보 ==="
echo "날짜: $(date)"
echo "=== Docker 컨테이너 상태 ==="
docker-compose ps
echo "=== Docker 로그 (최근 100줄) ==="
docker-compose logs --tail=100
echo "=== 시스템 리소스 ==="
df -h
free -h
echo "=== 네트워크 상태 ==="
netstat -tlnp | grep -E ':(3000|5432|9092)'
```

### 2. 성능 리포트 생성

```bash
# 성능 측정 스크립트
#!/bin/bash
echo "=== API 성능 테스트 ==="
for i in {1..10}; do
    curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/health
done

echo "=== 데이터베이스 성능 ==="
docker-compose exec postgres psql -U smguser -d smg_kafka -c "
SELECT schemaname,tablename,attname,n_distinct,correlation
FROM pg_stats
WHERE tablename IN ('messages', 'user_activities', 'system_metrics')
ORDER BY tablename, attname;
"
```

이 문제 해결 가이드를 참조하여 SMG Kafka 시스템의 다양한 문제를 신속하게 해결할 수 있습니다.
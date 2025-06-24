# SMG Kafka 설치 및 설정 가이드

이 문서는 SMG Kafka 프로젝트의 상세한 설치 및 설정 방법을 설명합니다.

## 📋 사전 요구사항

### 시스템 요구사항
- **OS**: Linux, macOS, Windows (WSL2 권장)
- **Memory**: 최소 4GB RAM (권장 8GB+)
- **Storage**: 최소 10GB 여유 공간
- **Network**: Docker 컨테이너 간 통신을 위한 네트워크 설정

### 필요한 소프트웨어

1. **Node.js** (v18.0.0 이상)
   ```bash
   # Node.js 설치 확인
   node --version
   npm --version
   ```

2. **pnpm** (v8.0.0 이상)
   ```bash
   # pnpm 설치
   npm install -g pnpm
   
   # 설치 확인
   pnpm --version
   ```

3. **Docker & Docker Compose**
   ```bash
   # Docker 설치 확인
   docker --version
   docker-compose --version
   ```

4. **Git**
   ```bash
   # Git 설치 확인
   git --version
   ```

## 🔧 설치 과정

### 1. 프로젝트 클론

```bash
# 저장소 클론
git clone <repository-url>
cd smg-kafka

# 브랜치 확인
git branch -a
```

### 2. Node.js 의존성 설치

```bash
# pnpm으로 의존성 설치
pnpm install

# 설치 확인
pnpm list
```

### 3. 환경 변수 설정

```bash
# 환경 파일 복사
cp .env.example .env

# 환경 파일 편집
nano .env  # 또는 선호하는 에디터 사용
```

**환경 변수 설명:**

```bash
# 데이터베이스 연결 URL
DATABASE_URL="postgresql://smguser:smgpassword@localhost:5432/smg_kafka"

# Kafka 브로커 주소 (여러 개는 쉼표로 구분)
KAFKA_BROKERS="localhost:9092"

# Kafka 클라이언트 설정
KAFKA_CLIENT_ID="smg-kafka-client"
KAFKA_GROUP_ID="smg-kafka-group"

# API 서버 포트
API_PORT=3000

# 실행 환경 (development, production, test)
NODE_ENV=development

# 로그 레벨 (error, warn, info, debug)
LOG_LEVEL=info
```

### 4. Docker 환경 시작

```bash
# Docker 컨테이너 시작 (백그라운드)
pnpm run docker:up

# 컨테이너 상태 확인
docker ps

# 로그 확인
pnpm run docker:logs
```

**컨테이너 상태 확인:**
```bash
# 각 서비스가 정상적으로 실행되는지 확인
docker ps --format \"table {{.Names}}\\t{{.Status}}\\t{{.Ports}}\"
```

예상 출력:
```
NAMES               STATUS              PORTS
smg-kafka-manager   Up 2 minutes        0.0.0.0:9000->9000/tcp
smg-adminer         Up 2 minutes        0.0.0.0:8080->8080/tcp
smg-postgres        Up 2 minutes        0.0.0.0:5432->5432/tcp
smg-kafka           Up 2 minutes        0.0.0.0:9092->9092/tcp, 0.0.0.0:9101->9101/tcp
smg-zookeeper       Up 2 minutes        0.0.0.0:2181->2181/tcp
```

### 5. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
pnpm run prisma:generate

# 데이터베이스 마이그레이션 실행
pnpm run prisma:migrate

# 마이그레이션 확인
pnpm run prisma:studio
```

**데이터베이스 연결 테스트:**
```bash
# PostgreSQL 연결 테스트
docker exec -it smg-postgres psql -U smguser -d smg_kafka -c \"\\dt\"
```

### 6. 서비스 확인

각 서비스가 정상적으로 동작하는지 확인합니다:

**Kafka 상태 확인:**
```bash
# Kafka 토픽 목록 확인
docker exec -it smg-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Kafka 브로커 상태 확인
docker exec -it smg-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

**PostgreSQL 상태 확인:**
```bash
# 데이터베이스 연결 테스트
docker exec -it smg-postgres pg_isready -U smguser -d smg_kafka
```

## 🚀 서비스 실행

### 개발 환경에서 실행

**방법 1: 개별 터미널에서 실행 (권장)**

```bash
# 터미널 1: Producer 실행
pnpm run dev:producer

# 터미널 2: Consumer 실행
pnpm run dev:consumer

# 터미널 3: API 서버 실행
pnpm run dev:api
```

**방법 2: 백그라운드 실행**

```bash
# 모든 서비스를 백그라운드에서 실행
nohup pnpm run dev:producer > logs/producer.log 2>&1 &
nohup pnpm run dev:consumer > logs/consumer.log 2>&1 &
nohup pnpm run dev:api > logs/api.log 2>&1 &

# 프로세스 확인
ps aux | grep node
```

### 프로덕션 환경에서 실행

```bash
# TypeScript 빌드
pnpm run build

# 빌드된 파일로 실행
pnpm run start:producer &
pnpm run start:consumer &
pnpm run start:api &
```

## 🔍 상태 확인 및 테스트

### 1. 서비스 상태 확인

```bash
# API 서버 Health Check
curl http://localhost:3000/health

# Kafka Manager 접속
open http://localhost:9000

# Adminer 접속 (데이터베이스 관리)
open http://localhost:8080
```

### 2. 기본 테스트

**API 테스트:**
```bash
# 통계 API 호출
curl http://localhost:3000/api/stats

# 사용자 활동 데이터 전송 테스트
curl -X POST http://localhost:3000/api/produce/user-activity \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"userId\": \"test-user\",
    \"action\": \"login\",
    \"resource\": \"/dashboard\"
  }'

# 메트릭 데이터 전송 테스트
curl -X POST http://localhost:3000/api/produce/metric \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"metricName\": \"cpu_usage\",
    \"value\": 75.5,
    \"unit\": \"percentage\"
  }'
```

**데이터 조회 테스트:**
```bash
# 저장된 메시지 조회
curl \"http://localhost:3000/api/messages?limit=10\"

# 사용자 활동 조회
curl \"http://localhost:3000/api/user-activities?limit=10\"

# 메트릭 조회
curl \"http://localhost:3000/api/metrics?limit=10\"
```

## 🐛 문제 해결

### 일반적인 문제들

**1. Docker 컨테이너가 시작되지 않는 경우:**
```bash
# 포트 충돌 확인
netstat -tlnp | grep -E ':9092|:5432|:2181'

# Docker 리소스 정리
docker system prune -a

# 컨테이너 재시작
pnpm run docker:down
pnpm run docker:up
```

**2. Kafka 연결 오류:**
```bash
# Kafka 로그 확인
docker logs smg-kafka

# Zookeeper 상태 확인
docker exec -it smg-zookeeper zkServer.sh status
```

**3. 데이터베이스 연결 오류:**
```bash
# PostgreSQL 로그 확인
docker logs smg-postgres

# 데이터베이스 재시작
docker restart smg-postgres
```

**4. pnpm 설치 오류:**
```bash
# npm 캐시 정리
npm cache clean --force

# pnpm 재설치
npm uninstall -g pnpm
npm install -g pnpm@latest
```

### 성능 최적화

**1. Docker 리소스 할당:**
```bash
# Docker Desktop에서 리소스 설정 조정
# Memory: 4GB 이상
# CPU: 2 cores 이상
# Disk: 10GB 이상
```

**2. Kafka 설정 최적화:**
```yaml
# docker-compose.yml에서 Kafka 설정 조정
environment:
  KAFKA_JVM_PERFORMANCE_OPTS: \"-Xmx1g -Xms1g\"
  KAFKA_HEAP_OPTS: \"-Xmx1g -Xms1g\"
```

## 📚 다음 단계

설치가 완료되었다면 다음 문서들을 참고하세요:

1. [API 문서](./API.md) - REST API 사용법
2. [Kafka 가이드](./KAFKA_GUIDE.md) - Kafka 운영 가이드
3. [아키텍처 문서](./docs/architecture.md) - 시스템 구조 이해
4. [배포 가이드](./docs/deployment.md) - 프로덕션 배포

## 💡 팁

- 개발 시에는 `pnpm run docker:logs`로 로그를 확인하세요
- Kafka Manager (http://localhost:9000)에서 토픽과 메시지를 모니터링하세요
- Prisma Studio (http://localhost:5555)로 데이터베이스를 관리하세요
- 각 서비스의 로그를 개별적으로 확인하여 문제를 진단하세요
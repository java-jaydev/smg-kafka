# SMG Kafka 개발 가이드

## 🚀 개발 환경 설정

### 필수 요구사항

- **Node.js**: 18.0.0 이상
- **pnpm**: 8.0.0 이상
- **Docker**: 20.10.0 이상
- **Docker Compose**: 2.0.0 이상
- **PostgreSQL**: 12 이상 (Docker로 제공)
- **Apache Kafka**: 2.8.0 이상 (Docker로 제공)

### 초기 설정

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd smg-kafka
   ```

2. **의존성 설치**
   ```bash
   pnpm install
   ```

3. **환경 설정**
   ```bash
   cp .env.example .env
   # .env 파일을 필요에 따라 수정
   ```

4. **Docker 서비스 시작**
   ```bash
   pnpm run docker:up
   ```

5. **데이터베이스 마이그레이션**
   ```bash
   pnpm run prisma:migrate
   pnpm run prisma:generate
   ```

## 🏗️ 프로젝트 구조

```
smg-kafka/
├── src/
│   ├── api/                 # REST API 서버
│   ├── config/              # 설정 파일들
│   ├── consumer/            # Kafka 컨슈머
│   ├── models/              # TypeScript 타입 정의
│   ├── producer/            # Kafka 프로듀서
│   └── utils/               # 유틸리티 함수들
├── tests/                   # 테스트 파일들
├── prisma/                  # 데이터베이스 스키마
├── scripts/                 # 유틸리티 스크립트들
├── nginx/                   # Nginx 설정 (프로덕션)
├── monitoring/              # 모니터링 설정
└── docs/                    # 문서화
```

## 🔧 개발 워크플로우

### 1. 기능 개발

```bash
# 개발 브랜치 생성
git checkout -b feature/new-feature

# 개발 서버 시작
pnpm run dev:api      # API 서버
pnpm run dev:producer # Producer
pnpm run dev:consumer # Consumer

# 코드 변경 후 테스트
pnpm run test
pnpm run lint
pnpm run typecheck
```

### 2. 데이터베이스 스키마 변경

```bash
# Prisma 스키마 수정 후
pnpm run prisma:migrate dev --name add_new_feature
pnpm run prisma:generate
```

### 3. 새로운 Kafka 토픽 추가

1. `src/config/kafka.ts`에 토픽 추가
2. Producer에 메시지 전송 메서드 추가
3. Consumer에 메시지 처리 로직 추가
4. 필요시 데이터베이스 테이블 추가

### 4. API 엔드포인트 추가

1. `src/api/index.ts`에 라우트 추가
2. TypeScript 타입 정의 (`src/models/`)
3. 테스트 코드 작성
4. API 문서 업데이트

## 🧪 테스트

### 테스트 실행

```bash
# 전체 테스트
pnpm test

# 테스트 감시 모드
pnpm run test:watch

# 커버리지 포함 테스트
pnpm run test:coverage

# 단위 테스트만
pnpm run test:unit

# 통합 테스트만
pnpm run test:integration
```

### 테스트 작성 가이드

1. **단위 테스트**: 각 모듈/함수별로 작성
2. **통합 테스트**: API 엔드포인트 및 전체 워크플로우
3. **Mock 사용**: 외부 의존성은 Mock으로 처리

```typescript
// 예시: API 테스트
describe('Messages API', () => {
  it('should fetch messages with pagination', async () => {
    const response = await request(app)
      .get('/api/messages?limit=10&offset=0')
      .expect(200)
    
    expect(response.body).toHaveProperty('data')
    expect(response.body).toHaveProperty('pagination')
  })
})
```

## 📊 모니터링 및 로깅

### 로그 레벨 설정

```typescript
// .env 파일에서 설정
LOG_LEVEL=debug  // debug, info, warn, error
```

### 사용자 정의 로깅

```typescript
import { logger } from '../utils/logger'

logger.info('Processing message', { topic, partition, offset })
logger.error('Failed to process message', error)
logger.debug('Debug information', { context })
```

### 메트릭 수집

```typescript
// 시스템 메트릭 전송 예시
await producer.sendSystemMetric({
  metricName: 'api_response_time',
  value: responseTime,
  unit: 'milliseconds',
  tags: { endpoint: '/api/messages', method: 'GET' }
})
```

## 🔒 보안 고려사항

### 환경 변수 관리

- 민감한 정보는 환경 변수로 관리
- `.env` 파일은 Git에 커밋하지 않음
- 프로덕션에서는 외부 시크릿 관리 도구 사용

### API 보안

```typescript
// Rate limiting 설정
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per windowMs
}))

// CORS 설정
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(','),
  credentials: true
}))
```

## 🚀 배포

### 개발 환경 배포

```bash
# Docker로 전체 스택 시작
pnpm run docker:up

# 로그 확인
pnpm run docker:logs
```

### 프로덕션 배포

```bash
# 프로덕션 설정으로 배포
./scripts/deploy.sh production

# 배포 상태 확인
curl http://localhost/health
```

## 🛠️ 디버깅

### Docker 컨테이너 디버깅

```bash
# 컨테이너 상태 확인
docker-compose ps

# 컨테이너 로그 확인
docker-compose logs -f kafka
docker-compose logs -f postgres

# 컨테이너 내부 접근
docker-compose exec postgres psql -U smguser -d smg_kafka
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Kafka 디버깅

```bash
# 토픽 목록 확인
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# 컨슈머 그룹 상태 확인
docker-compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group smg-kafka-group

# 메시지 확인
docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-activities --from-beginning
```

### 데이터베이스 디버깅

```bash
# Prisma Studio 시작
pnpm run prisma:studio

# 직접 PostgreSQL 접근
docker-compose exec postgres psql -U smguser -d smg_kafka

# 쿼리 성능 분석
EXPLAIN ANALYZE SELECT * FROM messages WHERE topic = 'user-activities';
```

## 📈 성능 최적화

### Kafka 최적화

1. **배치 처리**: 메시지를 배치로 처리
2. **파티셔닝**: 적절한 파티션 키 설정
3. **압축**: 메시지 압축 사용

### 데이터베이스 최적화

1. **인덱싱**: 자주 쿼리되는 컬럼에 인덱스 추가
2. **커넥션 풀링**: 데이터베이스 연결 재사용
3. **쿼리 최적화**: 불필요한 데이터 로딩 방지

### API 최적화

1. **캐싱**: Redis를 이용한 응답 캐싱
2. **페이지네이션**: 대용량 데이터 처리
3. **압축**: HTTP 응답 압축

## 🤝 기여 가이드

### 코드 스타일

- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포맷팅
- **TypeScript**: 타입 안정성

```bash
# 코드 검사 및 포맷팅
pnpm run lint
pnpm run lint:fix
pnpm run format
```

### 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 스크립트 등 수정
```

### Pull Request 프로세스

1. 기능 브랜치에서 개발
2. 테스트 작성 및 실행
3. 코드 리뷰 요청
4. CI/CD 통과 확인
5. main 브랜치에 병합

## 🆘 문제 해결

### 자주 발생하는 문제

1. **Kafka 연결 실패**
   - Docker 컨테이너 상태 확인
   - 네트워크 설정 확인

2. **데이터베이스 마이그레이션 실패**
   - 스키마 변경 사항 확인
   - 기존 데이터와의 호환성 검토

3. **메모리 부족**
   - Node.js 힙 메모리 크기 조정
   - Docker 리소스 한계 조정

### 성능 문제

1. **느린 API 응답**
   - 데이터베이스 쿼리 최적화
   - 인덱스 추가
   - 캐싱 적용

2. **Kafka 처리 지연**
   - 컨슈머 그룹 확장
   - 배치 크기 조정
   - 파티션 수 증가

## 📚 추가 리소스

- [Kafka 공식 문서](https://kafka.apache.org/documentation/)
- [Prisma 가이드](https://www.prisma.io/docs/)
- [Express.js 문서](https://expressjs.com/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Jest 테스팅 가이드](https://jestjs.io/docs/getting-started)
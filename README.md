# SMG Kafka 데이터 파이프라인

Node.js와 Kafka를 사용한 실시간 데이터 파이프라인 프로젝트입니다.

## 🚀 프로젝트 개요

이 프로젝트는 Kafka를 중심으로 한 실시간 데이터 처리 시스템으로, 다음과 같은 기능을 제공합니다:

- **데이터 수집**: Kafka Producer를 통한 다양한 데이터 수집
- **실시간 처리**: Kafka Consumer를 통한 실시간 데이터 처리 및 저장
- **데이터 조회**: REST API를 통한 저장된 데이터 조회
- **모니터링**: Kafka 클러스터 및 데이터 파이프라인 모니터링

## 🏗️ 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Producer  │───▶│    Kafka    │───▶│  Consumer   │───▶│ PostgreSQL  │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
┌─────────────┐                                              │
│  REST API   │◀─────────────────────────────────────────────┘
│             │
└─────────────┘
```

## 🛠️ 기술 스택

- **Backend**: Node.js, TypeScript
- **Message Broker**: Apache Kafka
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API Framework**: Express.js
- **Package Manager**: pnpm
- **Containerization**: Docker, Docker Compose
- **Monitoring**: Kafka Manager, Adminer

## 📋 주요 기능

### 데이터 수집 토픽
- `user-activities`: 사용자 활동 로그
- `system-metrics`: 시스템 메트릭
- `error-logs`: 에러 로그
- `notifications`: 알림 메시지

### API 엔드포인트
- `/api/messages` - Kafka 메시지 조회
- `/api/user-activities` - 사용자 활동 조회
- `/api/metrics` - 시스템 메트릭 조회
- `/api/errors` - 에러 로그 조회
- `/api/topics` - Kafka 토픽 상태 조회
- `/api/stats` - 전체 통계 조회

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone <repository-url>
cd smg-kafka
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 환경 설정

```bash
cp .env.example .env
# .env 파일을 필요에 따라 수정
```

### 4. Docker 환경 시작

```bash
pnpm run docker:up
```

### 5. 데이터베이스 마이그레이션

```bash
pnpm run prisma:migrate
pnpm run prisma:generate
```

### 6. 서비스 시작

```bash
# Producer 시작 (터미널 1)
pnpm run dev:producer

# Consumer 시작 (터미널 2)
pnpm run dev:consumer

# API 서버 시작 (터미널 3)
pnpm run dev:api
```

## 🔧 개발 명령어

```bash
# 개발 환경 실행
pnpm run dev              # API 서버 시작
pnpm run dev:producer     # Producer 시작
pnpm run dev:consumer     # Consumer 시작

# 빌드
pnpm run build            # TypeScript 빌드

# 프로덕션 실행
pnpm start                # API 서버 실행
pnpm run start:producer   # Producer 실행
pnpm run start:consumer   # Consumer 실행

# Docker 관리
pnpm run docker:up        # Docker 컨테이너 시작
pnpm run docker:down      # Docker 컨테이너 중지
pnpm run docker:logs      # Docker 로그 확인

# 데이터베이스
pnpm run prisma:generate  # Prisma 클라이언트 생성
pnpm run prisma:migrate   # 마이그레이션 실행
pnpm run prisma:studio    # Prisma Studio 시작

# 테스트 및 코드 품질
pnpm test                 # 테스트 실행
pnpm run lint             # ESLint 실행
pnpm run format           # Prettier 포맷팅
```

## 🌐 접속 URL

서비스가 정상적으로 시작되면 다음 URL로 접속할 수 있습니다:

- **API 서버**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Kafka Manager**: http://localhost:9000
- **Adminer (DB 관리)**: http://localhost:8080
- **Prisma Studio**: http://localhost:5555

## 📊 모니터링

### Kafka Manager
- URL: http://localhost:9000
- Kafka 클러스터, 토픽, 컨슈머 그룹 모니터링

### Adminer
- URL: http://localhost:8080
- 데이터베이스: `smg_kafka`
- 사용자: `smguser`
- 비밀번호: `smgpassword`

## 📚 문서

- [상세 설치 가이드](./SETUP.md)
- [API 문서](./API.md)
- [Kafka 사용 가이드](./KAFKA_GUIDE.md)
- [시스템 아키텍처](./docs/architecture.md)
- [배포 가이드](./docs/deployment.md)
- [문제 해결](./docs/troubleshooting.md)

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

**Made with ❤️ for Real-time Data Processing**
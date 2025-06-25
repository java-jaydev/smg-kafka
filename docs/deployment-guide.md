# SMG Kafka 배포 가이드

## 🎯 배포 개요

이 가이드는 SMG Kafka 애플리케이션을 다양한 환경에 배포하는 방법을 설명합니다.

## 🏗️ 배포 아키텍처

### 프로덕션 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Nginx    │───▶│  SMG Kafka  │───▶│ PostgreSQL  │
│ Load Balancer│    │    API      │    │  Database   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                   ┌─────────────┐    ┌─────────────┐
                   │    Kafka    │───▶│    Redis    │
                   │  Cluster    │    │    Cache    │
                   └─────────────┘    └─────────────┘
                           │
                   ┌─────────────┐    ┌─────────────┐
                   │ Prometheus  │───▶│   Grafana   │
                   │ Monitoring  │    │ Dashboard   │
                   └─────────────┘    └─────────────┘
```

## 🐳 Docker 배포

### 개발 환경 배포

```bash
# 1. 저장소 클론
git clone <repository-url>
cd smg-kafka

# 2. 환경 설정
cp .env.example .env
# .env 파일 수정

# 3. 개발 환경 시작
pnpm run docker:up

# 4. 데이터베이스 마이그레이션
pnpm run prisma:migrate

# 5. 애플리케이션 시작
pnpm run dev:api
pnpm run dev:producer
pnpm run dev:consumer
```

### 프로덕션 환경 배포

```bash
# 1. 환경 설정
cp .env.example .env.production
# 프로덕션 환경 변수 설정

# 2. 프로덕션 배포 실행
./scripts/deploy.sh production

# 3. 서비스 상태 확인
curl http://localhost/health
```

## ☁️ 클라우드 배포

### AWS ECS 배포

#### 1. ECR 이미지 푸시

```bash
# ECR 로그인
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com

# 이미지 빌드 및 태그
docker build -f Dockerfile.prod -t smg-kafka:latest .
docker tag smg-kafka:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/smg-kafka:latest

# 이미지 푸시
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/smg-kafka:latest
```

#### 2. ECS 태스크 정의

```json
{
  "family": "smg-kafka",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "smg-kafka-api",
      "image": "<account-id>.dkr.ecr.us-west-2.amazonaws.com/smg-kafka:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://username:password@rds-endpoint:5432/smg_kafka"
        },
        {
          "name": "KAFKA_BROKERS",
          "value": "kafka-broker-1:9092,kafka-broker-2:9092"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/smg-kafka",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Google Cloud Run 배포

```bash
# 1. Google Cloud SDK 설정
gcloud auth login
gcloud config set project <project-id>

# 2. Container Registry에 이미지 푸시
docker build -f Dockerfile.prod -t gcr.io/<project-id>/smg-kafka:latest .
docker push gcr.io/<project-id>/smg-kafka:latest

# 3. Cloud Run 서비스 배포
gcloud run deploy smg-kafka \
  --image gcr.io/<project-id>/smg-kafka:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="postgresql://..." \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10
```

### Azure Container Instances 배포

```bash
# 1. Azure CLI 로그인
az login

# 2. 리소스 그룹 생성
az group create --name smg-kafka-rg --location eastus

# 3. Container Registry 생성
az acr create --resource-group smg-kafka-rg --name smgkafkaregistry --sku Basic

# 4. 이미지 빌드 및 푸시
az acr build --registry smgkafkaregistry --image smg-kafka:latest .

# 5. Container Instance 생성
az container create \
  --resource-group smg-kafka-rg \
  --name smg-kafka-api \
  --image smgkafkaregistry.azurecr.io/smg-kafka:latest \
  --cpu 2 \
  --memory 4 \
  --restart-policy Always \
  --environment-variables NODE_ENV=production \
  --ports 3000
```

## 🔧 Kubernetes 배포

### 1. Kubernetes 매니페스트

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: smg-kafka-config
data:
  NODE_ENV: "production"
  API_PORT: "3000"
  LOG_LEVEL: "info"
  KAFKA_BROKERS: "kafka-service:9092"
```

#### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: smg-kafka-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smg-kafka-api
  labels:
    app: smg-kafka-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smg-kafka-api
  template:
    metadata:
      labels:
        app: smg-kafka-api
    spec:
      containers:
      - name: smg-kafka-api
        image: smg-kafka:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: smg-kafka-config
        - secretRef:
            name: smg-kafka-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: smg-kafka-api-service
spec:
  selector:
    app: smg-kafka-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### 2. Helm 차트 배포

#### values.yaml

```yaml
image:
  repository: smg-kafka
  tag: latest
  pullPolicy: IfNotPresent

replicaCount: 3

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
  hosts:
    - host: smg-kafka.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

postgresql:
  enabled: true
  postgresqlUsername: smguser
  postgresqlPassword: smgpassword
  postgresqlDatabase: smg_kafka

kafka:
  enabled: true
  replicaCount: 3
  zookeeper:
    enabled: true
```

## 🔒 보안 구성

### SSL/TLS 설정

#### Nginx SSL 설정

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://smg_kafka_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Let's Encrypt 인증서

```bash
# Certbot 설치 및 인증서 획득
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📊 모니터링 및 로깅

### Prometheus + Grafana 설정

#### prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'smg-kafka'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Grafana 대시보드 설정

```json
{
  "dashboard": {
    "title": "SMG Kafka Monitoring",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Kafka Message Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(kafka_messages_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### 로그 수집 (ELK Stack)

#### Filebeat 설정

```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/*.log
  fields:
    service: smg-kafka
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch:9200"]

setup.kibana:
  host: "kibana:5601"
```

## 🚀 CI/CD 파이프라인

### GitHub Actions

```yaml
name: Deploy SMG Kafka

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm test
      - run: pnpm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker build -f Dockerfile.prod -t smg-kafka:latest .
          # 배포 스크립트 실행
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                sh 'pnpm install'
                sh 'pnpm test'
                sh 'pnpm run build'
            }
        }
        
        stage('Build') {
            steps {
                sh 'docker build -f Dockerfile.prod -t smg-kafka:${BUILD_NUMBER} .'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh './scripts/deploy.sh production'
            }
        }
    }
}
```

## 🔄 백업 및 복구

### 데이터베이스 백업

```bash
# 자동 백업 스크립트 (cron job)
0 2 * * * /path/to/scripts/postgres-backup.sh

# 백업 확인
ls -la /var/backups/postgres/
```

### Kafka 토픽 백업

```bash
# Kafka 토픽 백업
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-activities \
  --from-beginning \
  --max-messages 1000000 > backup-user-activities.json
```

### 복구 절차

```bash
# 1. 서비스 중지
docker-compose down

# 2. 데이터베이스 복구
psql -U smguser -d smg_kafka < backup.sql

# 3. 서비스 시작
docker-compose up -d

# 4. 상태 확인
curl http://localhost/health
```

## 🔧 트러블슈팅

### 자주 발생하는 문제

1. **메모리 부족**
   ```bash
   # Node.js 힙 메모리 증가
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Kafka 연결 문제**
   ```bash
   # Kafka 브로커 상태 확인
   docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
   ```

3. **데이터베이스 연결 문제**
   ```bash
   # PostgreSQL 연결 테스트
   docker-compose exec postgres pg_isready -U smguser
   ```

### 성능 최적화

1. **데이터베이스 튜닝**
   ```sql
   -- 느린 쿼리 찾기
   SELECT query, mean_time, rows, 100.0 * shared_blks_hit /
          nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
   FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
   ```

2. **Kafka 튜닝**
   ```properties
   # producer.properties
   batch.size=16384
   linger.ms=5
   compression.type=lz4
   
   # consumer.properties
   fetch.min.bytes=1024
   fetch.max.wait.ms=500
   ```

## 📈 확장성

### 수평적 확장

1. **API 서버 확장**
   ```bash
   # Docker Compose 스케일링
   docker-compose up -d --scale app=3
   ```

2. **Kafka 파티션 증가**
   ```bash
   kafka-topics --bootstrap-server localhost:9092 \
     --alter --topic user-activities --partitions 6
   ```

3. **데이터베이스 읽기 복제본**
   ```yaml
   # docker-compose.yml에 읽기 전용 복제본 추가
   postgres-replica:
     image: postgres:16-alpine
     environment:
       POSTGRES_USER: replica
       POSTGRES_PASSWORD: replica
   ```

### 로드 밸런싱

```nginx
upstream smg_kafka_api {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
}
```

## 📋 배포 체크리스트

### 배포 전 확인사항

- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 준비
- [ ] SSL 인증서 설정
- [ ] 백업 시스템 확인
- [ ] 모니터링 설정 완료
- [ ] 로그 수집 설정 완료

### 배포 후 확인사항

- [ ] Health check 통과
- [ ] API 엔드포인트 정상 동작
- [ ] Kafka 메시지 처리 정상
- [ ] 데이터베이스 연결 정상
- [ ] 모니터링 메트릭 수집 정상
- [ ] 로그 수집 정상
- [ ] 성능 지표 확인

이 가이드를 따라 SMG Kafka 애플리케이션을 안전하고 효율적으로 배포할 수 있습니다.
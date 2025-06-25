#!/bin/bash

# SMG Kafka 프로덕션 배포 스크립트
# Usage: ./deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-"production"}
PROJECT_NAME="smg-kafka"
BACKUP_ENABLED=${BACKUP_ENABLED:-"true"}

echo "🚀 Starting deployment for SMG Kafka ($ENVIRONMENT environment)"

# 환경 검증
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Valid environments: production, staging"
    exit 1
fi

# Docker 및 Docker Compose 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# 환경 변수 파일 확인
ENV_FILE=".env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "✅ Environment file found: $ENV_FILE"

# 백업 (프로덕션 환경에서만)
if [ "$ENVIRONMENT" = "production" ] && [ "$BACKUP_ENABLED" = "true" ]; then
    echo "🗂️  Creating backup before deployment..."
    docker-compose -f docker-compose.prod.yml exec -T postgres /usr/local/bin/backup.sh || echo "⚠️  Backup failed, continuing..."
fi

# 이전 컨테이너 중지
echo "⏹️  Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# 이미지 빌드
echo "🔨 Building new images..."
docker-compose -f docker-compose.prod.yml build --no-cache app

# 데이터베이스 마이그레이션 (별도 컨테이너에서 실행)
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm app sh -c "pnpm prisma:migrate deploy"

# 새 컨테이너 시작
echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# 헬스 체크 대기
echo "⏳ Waiting for services to be healthy..."
sleep 30

# 서비스 상태 확인
echo "🔍 Checking service health..."
for i in {1..30}; do
    if curl -f http://localhost/health &>/dev/null; then
        echo "✅ Application is healthy!"
        break
    else
        echo "⏳ Waiting for application to be ready... (attempt $i/30)"
        sleep 10
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ Application failed to start properly"
        echo "📋 Container logs:"
        docker-compose -f docker-compose.prod.yml logs --tail=50 app
        exit 1
    fi
done

# 컨테이너 상태 확인
echo "📊 Final container status:"
docker-compose -f docker-compose.prod.yml ps

# 리소스 정리
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f

echo "🎉 Deployment completed successfully!"
echo "🌐 Application is available at: http://localhost"
echo "📊 Grafana dashboard: http://localhost:3001"
echo "🔍 Prometheus metrics: http://localhost:9090"

# 배포 후 테스트
echo "🧪 Running post-deployment tests..."
if curl -f http://localhost/health; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

if curl -f http://localhost/api/stats; then
    echo "✅ API endpoint check passed"
else
    echo "❌ API endpoint check failed"
    exit 1
fi

echo "🎊 All checks passed! Deployment is complete."
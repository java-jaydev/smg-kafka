-- SMG Kafka 데이터베이스 초기화 스크립트

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 타임스탬프 함수
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 초기 스키마는 Prisma에서 관리하므로 여기서는 기본 설정만 수행
-- 데이터베이스가 정상적으로 생성되었음을 확인하는 테스트 테이블
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message TEXT DEFAULT 'Database initialized successfully'
);

INSERT INTO health_check (message) VALUES ('SMG Kafka Database Ready');
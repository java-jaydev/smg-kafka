# API 문서

SMG Kafka 프로젝트의 REST API 사용법을 설명합니다.

## 📋 기본 정보

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Authentication**: 현재 미구현 (필요시 추가 가능)

## 🔍 Health Check

### GET /health

서버 상태를 확인합니다.

**응답 예시:**
```json
{
  \"status\": \"healthy\",
  \"timestamp\": \"2024-01-15T10:30:00.000Z\",
  \"uptime\": 3600.123,
  \"version\": \"1.0.0\"
}
```

## 📨 메시지 API

### GET /api/messages

저장된 Kafka 메시지를 조회합니다.

**Query Parameters:**
- `topic` (string, optional): 특정 토픽 필터링
- `limit` (number, optional, default: 100): 조회할 메시지 수
- `offset` (number, optional, default: 0): 페이지네이션 오프셋
- `startDate` (string, optional): 시작 날짜 (ISO 8601)
- `endDate` (string, optional): 종료 날짜 (ISO 8601)

**예시 요청:**
```bash
curl \"http://localhost:3000/api/messages?topic=user-activities&limit=50&offset=0\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"id\": \"uuid-string\",
      \"topic\": \"user-activities\",
      \"partition\": 0,
      \"offset\": \"12345\",
      \"key\": \"user-001\",
      \"value\": {
        \"userId\": \"user-001\",
        \"action\": \"login\",
        \"timestamp\": \"2024-01-15T10:30:00.000Z\"
      },
      \"timestamp\": \"2024-01-15T10:30:00.000Z\",
      \"createdAt\": \"2024-01-15T10:30:01.000Z\"
    }
  ],
  \"pagination\": {
    \"total\": 500,
    \"limit\": 50,
    \"offset\": 0,
    \"hasMore\": true
  }
}
```

## 👤 사용자 활동 API

### GET /api/user-activities

사용자 활동 로그를 조회합니다.

**Query Parameters:**
- `userId` (string, optional): 특정 사용자 필터링
- `action` (string, optional): 특정 액션 필터링
- `limit` (number, optional, default: 100): 조회할 데이터 수
- `offset` (number, optional, default: 0): 페이지네이션 오프셋
- `startDate` (string, optional): 시작 날짜
- `endDate` (string, optional): 종료 날짜

**예시 요청:**
```bash
curl \"http://localhost:3000/api/user-activities?userId=user-001&action=login\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"id\": \"uuid-string\",
      \"userId\": \"user-001\",
      \"action\": \"login\",
      \"resource\": \"/dashboard\",
      \"metadata\": {
        \"browser\": \"Chrome\",
        \"version\": \"120.0\"
      },
      \"ipAddress\": \"192.168.1.100\",
      \"userAgent\": \"Mozilla/5.0...\",
      \"timestamp\": \"2024-01-15T10:30:00.000Z\",
      \"createdAt\": \"2024-01-15T10:30:01.000Z\"
    }
  ],
  \"pagination\": {
    \"total\": 150,
    \"limit\": 100,
    \"offset\": 0,
    \"hasMore\": true
  }
}
```

### POST /api/produce/user-activity

사용자 활동을 Kafka로 전송합니다.

**Request Body:**
```json
{
  \"userId\": \"user-001\",
  \"action\": \"login\",
  \"resource\": \"/dashboard\",
  \"metadata\": {
    \"browser\": \"Chrome\",
    \"version\": \"120.0\"
  },
  \"ipAddress\": \"192.168.1.100\",
  \"userAgent\": \"Mozilla/5.0...\"
}
```

**응답 예시:**
```json
{
  \"success\": true,
  \"message\": \"User activity sent to Kafka\"
}
```

## 📊 시스템 메트릭 API

### GET /api/metrics

시스템 메트릭을 조회합니다.

**Query Parameters:**
- `metricName` (string, optional): 특정 메트릭 필터링
- `limit` (number, optional, default: 100): 조회할 데이터 수
- `offset` (number, optional, default: 0): 페이지네이션 오프셋
- `startDate` (string, optional): 시작 날짜
- `endDate` (string, optional): 종료 날짜

**예시 요청:**
```bash
curl \"http://localhost:3000/api/metrics?metricName=cpu_usage&limit=100\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"id\": \"uuid-string\",
      \"metricName\": \"cpu_usage\",
      \"value\": 75.5,
      \"unit\": \"percentage\",
      \"tags\": {
        \"server\": \"web-01\",
        \"environment\": \"production\"
      },
      \"timestamp\": \"2024-01-15T10:30:00.000Z\",
      \"createdAt\": \"2024-01-15T10:30:01.000Z\"
    }
  ],
  \"pagination\": {
    \"total\": 1000,
    \"limit\": 100,
    \"offset\": 0,
    \"hasMore\": true
  }
}
```

### GET /api/metrics/aggregated

집계된 메트릭 데이터를 조회합니다.

**Query Parameters:**
- `metricName` (string, required): 메트릭 이름
- `period` (string, optional, default: hour): 집계 단위 (minute, hour, day)
- `startDate` (string, optional): 시작 날짜
- `endDate` (string, optional): 종료 날짜

**예시 요청:**
```bash
curl \"http://localhost:3000/api/metrics/aggregated?metricName=cpu_usage&period=hour\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"period\": \"2024-01-15 10\",
      \"avg_value\": 72.3,
      \"min_value\": 45.2,
      \"max_value\": 89.1,
      \"count\": 120
    },
    {
      \"period\": \"2024-01-15 09\",
      \"avg_value\": 68.7,
      \"min_value\": 42.1,
      \"max_value\": 85.3,
      \"count\": 118
    }
  ]
}
```

### POST /api/produce/metric

시스템 메트릭을 Kafka로 전송합니다.

**Request Body:**
```json
{
  \"metricName\": \"cpu_usage\",
  \"value\": 75.5,
  \"unit\": \"percentage\",
  \"tags\": {
    \"server\": \"web-01\",
    \"environment\": \"production\"
  }
}
```

**응답 예시:**
```json
{
  \"success\": true,
  \"message\": \"Metric sent to Kafka\"
}
```

## 🚨 에러 로그 API

### GET /api/errors

에러 로그를 조회합니다.

**Query Parameters:**
- `service` (string, optional): 특정 서비스 필터링
- `severity` (string, optional): 심각도 필터링 (error, warning, critical)
- `resolved` (boolean, optional): 해결 상태 필터링
- `limit` (number, optional, default: 100): 조회할 데이터 수
- `offset` (number, optional, default: 0): 페이지네이션 오프셋

**예시 요청:**
```bash
curl \"http://localhost:3000/api/errors?service=api&severity=error&resolved=false\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"id\": \"uuid-string\",
      \"service\": \"api\",
      \"errorType\": \"DatabaseConnectionError\",
      \"message\": \"Failed to connect to database\",
      \"stackTrace\": \"Error: Connection timeout\\n    at ...\",
      \"context\": {
        \"attempt\": 3,
        \"maxRetries\": 5
      },
      \"severity\": \"error\",
      \"resolved\": false,
      \"resolvedAt\": null,
      \"timestamp\": \"2024-01-15T10:30:00.000Z\",
      \"createdAt\": \"2024-01-15T10:30:01.000Z\"
    }
  ],
  \"pagination\": {
    \"total\": 25,
    \"limit\": 100,
    \"offset\": 0,
    \"hasMore\": false
  }
}
```

## 🔧 토픽 상태 API

### GET /api/topics

Kafka 토픽 상태를 조회합니다.

**예시 요청:**
```bash
curl \"http://localhost:3000/api/topics\"
```

**응답 예시:**
```json
{
  \"data\": [
    {
      \"id\": \"uuid-string\",
      \"topicName\": \"user-activities\",
      \"partitionCount\": 3,
      \"replicationFactor\": 1,
      \"isActive\": true,
      \"lastMessageAt\": \"2024-01-15T10:30:00.000Z\",
      \"messageCount\": 15000,
      \"createdAt\": \"2024-01-15T08:00:00.000Z\",
      \"updatedAt\": \"2024-01-15T10:30:01.000Z\"
    }
  ]
}
```

## 📈 통계 API

### GET /api/stats

전체 시스템 통계를 조회합니다.

**예시 요청:**
```bash
curl \"http://localhost:3000/api/stats\"
```

**응답 예시:**
```json
{
  \"stats\": {
    \"messages\": 50000,
    \"userActivities\": 12000,
    \"metrics\": 25000,
    \"errors\": 150,
    \"activeTopics\": 4
  },
  \"timestamp\": \"2024-01-15T10:30:00.000Z\"
}
```

## 🔧 HTTP 상태 코드

- `200` - 요청 성공
- `400` - 잘못된 요청 (필수 파라미터 누락 등)
- `404` - 리소스를 찾을 수 없음
- `500` - 서버 내부 오류
- `503` - 서비스 사용 불가 (Health Check 실패)

## 📝 에러 응답 형식

```json
{
  \"error\": \"Error message\",
  \"timestamp\": \"2024-01-15T10:30:00.000Z\",
  \"path\": \"/api/messages\"
}
```

## 🔄 페이지네이션

모든 목록 API는 페이지네이션을 지원합니다:

- `limit`: 한 번에 가져올 데이터 수 (기본값: 100, 최대: 1000)
- `offset`: 건너뛸 데이터 수 (기본값: 0)

**페이지네이션 응답:**
```json
{
  \"pagination\": {
    \"total\": 1500,
    \"limit\": 100,
    \"offset\": 0,
    \"hasMore\": true
  }
}
```

## 📊 날짜 필터링

날짜 필터링을 지원하는 API에서는 ISO 8601 형식을 사용합니다:

- `startDate`: `2024-01-15T00:00:00.000Z`
- `endDate`: `2024-01-15T23:59:59.999Z`

**예시:**
```bash
curl \"http://localhost:3000/api/messages?startDate=2024-01-15T00:00:00.000Z&endDate=2024-01-15T23:59:59.999Z\"
```

## 🚀 사용 예시

### JavaScript/TypeScript 클라이언트

```typescript
class SMGKafkaClient {
  private baseURL = 'http://localhost:3000'

  async getUserActivities(params: {
    userId?: string
    action?: string
    limit?: number
    offset?: number
  }) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, value.toString())
    })

    const response = await fetch(`${this.baseURL}/api/user-activities?${query}`)
    return response.json()
  }

  async sendUserActivity(data: {
    userId: string
    action: string
    resource?: string
    metadata?: any
  }) {
    const response = await fetch(`${this.baseURL}/api/produce/user-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

### Python 클라이언트

```python
import requests
from typing import Optional, Dict, Any

class SMGKafkaClient:
    def __init__(self, base_url: str = \"http://localhost:3000\"):
        self.base_url = base_url

    def get_user_activities(self, user_id: Optional[str] = None, 
                          action: Optional[str] = None,
                          limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        params = {
            'limit': limit,
            'offset': offset
        }
        if user_id:
            params['userId'] = user_id
        if action:
            params['action'] = action
            
        response = requests.get(f\"{self.base_url}/api/user-activities\", params=params)
        return response.json()

    def send_user_activity(self, user_id: str, action: str, 
                         resource: Optional[str] = None,
                         metadata: Optional[Dict] = None) -> Dict[str, Any]:
        data = {
            'userId': user_id,
            'action': action
        }
        if resource:
            data['resource'] = resource
        if metadata:
            data['metadata'] = metadata
            
        response = requests.post(f\"{self.base_url}/api/produce/user-activity\", json=data)
        return response.json()
```
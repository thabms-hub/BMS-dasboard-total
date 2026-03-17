# API Contract: BMS Session API

**Source**: `docs/BMS-SESSION-FOR-DEV.md` v2.0

## 1. Session Retrieval

**Endpoint**: `GET https://hosxp.net/phapi/PasteJSON`

**Parameters**:
- `Action`: `GET`
- `code`: Session ID (GUID format)

**Success Response** (MessageCode 200):
```json
{
  "result": {
    "system_info": { "version": "string", "environment": "string" },
    "user_info": {
      "name": "string",
      "position": "string",
      "position_id": "number",
      "hospital_code": "string",
      "doctor_code": "string",
      "department": "string",
      "location": "string",
      "is_hr_admin": "boolean",
      "is_director": "boolean",
      "bms_url": "string (URL)",
      "bms_session_port": "number",
      "bms_session_code": "string (GUID/JWT)",
      "bms_database_name": "string",
      "bms_database_type": "string"
    },
    "key_value": "string (same as bms_session_code)",
    "expired_second": "number (default 36000)"
  },
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "string (ISO 8601)"
}
```

**Error Response** (MessageCode 500 = expired):
```json
{
  "MessageCode": 500,
  "Message": "Session expired or not found"
}
```

## 2. SQL Query Execution

**Endpoint**: `POST {bms_url}/api/sql`

**Headers**:
- `Authorization: Bearer {bms_session_code}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "sql": "string (SQL statement)",
  "app": "BMS.Dashboard.React",
  "params": {
    "param_name": { "value": "string", "value_type": "string|integer|float|date|time|datetime" }
  }
}
```

**Allowed SQL statements**: SELECT, DESCRIBE, EXPLAIN, SHOW, WITH (CTE)

**Success Response** (MessageCode 200):
```json
{
  "result": {},
  "MessageCode": 200,
  "Message": "OK",
  "RequestTime": "string (ISO 8601)",
  "data": [{ "column": "value" }],
  "field": [6],
  "field_name": ["column"],
  "record_count": 1
}
```

**Error Responses**:
- MessageCode 400: Invalid SQL or parameters
- MessageCode 409: SQL syntax error
- MessageCode 500: Database/server error
- HTTP 501: Unauthorized (missing/invalid Bearer token)

**Restrictions**:
- Blacklisted tables: opduser, opdconfig, sys_var, user_var, user_jwt
- Max 20 tables per query
- No dots in table names (prevents cross-database queries)

## 3. Field Type Codes

| Code | Type | Notes |
|------|------|-------|
| 1 | Boolean | |
| 2 | Integer | |
| 3 | Float | |
| 4 | DateTime | ISO 8601 string |
| 5 | Time | HH:mm:ss string |
| 6 | String | |
| 7 | Blob | Base64 encoded |
| 9 | String | |

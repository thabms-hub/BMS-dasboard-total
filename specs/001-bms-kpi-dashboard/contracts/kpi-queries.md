# KPI Query Contracts

**Branch**: `001-bms-kpi-dashboard` | **Date**: 2026-03-17

Queries verified on both MySQL and PostgreSQL via MCP tools.
SQL function differences require the database-type-aware query builder.

## Overview KPIs (US1)

### OPD Visit Count (today)

**MySQL**:
```sql
SELECT COUNT(*) as total FROM ovst WHERE vstdate = CURDATE()
```

**PostgreSQL**:
```sql
SELECT COUNT(*) as total FROM ovst WHERE vstdate = CURRENT_DATE
```

### IPD Patient Count (currently admitted)

```sql
SELECT COUNT(*) as total FROM ipt WHERE dchdate IS NULL
```
*(Same on both databases)*

### ER Visit Count (today)

**MySQL**:
```sql
SELECT COUNT(*) as total FROM er_regist WHERE vstdate = CURDATE()
```

**PostgreSQL**:
```sql
SELECT COUNT(*) as total FROM er_regist WHERE vstdate = CURRENT_DATE
```

### Department Workload (today)

**MySQL**:
```sql
SELECT k.department, COUNT(*) as visit_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
GROUP BY k.department
ORDER BY visit_count DESC
```

**PostgreSQL**:
```sql
SELECT k.department, COUNT(*) as visit_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURRENT_DATE
GROUP BY k.department
ORDER BY visit_count DESC
```

## Visit Trends (US2)

### Daily Visit Trend (date range)

**MySQL**:
```sql
SELECT DATE_FORMAT(vstdate, '%Y-%m-%d') as visit_date, COUNT(*) as visit_count
FROM ovst
WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY visit_date
ORDER BY visit_date
```

**PostgreSQL**:
```sql
SELECT TO_CHAR(vstdate, 'YYYY-MM-DD') as visit_date, COUNT(*) as visit_count
FROM ovst
WHERE vstdate >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY visit_date
ORDER BY visit_date
```

### Hourly Distribution (single day)

**MySQL**:
```sql
SELECT HOUR(vsttime) as hour, COUNT(*) as visit_count
FROM ovst
WHERE vstdate = :date
GROUP BY HOUR(vsttime)
ORDER BY hour
```

**PostgreSQL**:
```sql
SELECT EXTRACT(HOUR FROM vsttime)::int as hour, COUNT(*) as visit_count
FROM ovst
WHERE vstdate = :date
GROUP BY EXTRACT(HOUR FROM vsttime)
ORDER BY hour
```

## Department & Doctor Analytics (US3)

### Department Visit Breakdown (date range)

**MySQL**:
```sql
SELECT k.depcode, k.department, COUNT(*) as visit_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
GROUP BY k.depcode, k.department
ORDER BY visit_count DESC
```

**PostgreSQL**: Same query (no function differences)

### Doctor Workload (date range)

```sql
SELECT d.code, d.name as doctor_name, COUNT(*) as patient_count
FROM ovst o
LEFT JOIN doctor d ON o.doctor = d.code
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
GROUP BY d.code, d.name
ORDER BY patient_count DESC
LIMIT 50
```
*(Same on both databases)*

### Department Daily Trend

Same as "Daily Visit Trend" with added `WHERE o.cur_dep = :depcode` filter.

## Demographics & Insurance (US4)

### Gender Distribution

Primary (from `patient` table):
```sql
SELECT sex, COUNT(*) as count
FROM patient p
INNER JOIN ovst o ON p.hn = o.hn
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
GROUP BY sex
```

Fallback (when `patient` is empty, from `ovst_patient_record`):
```sql
SELECT opr.sex, COUNT(*) as count
FROM ovst_patient_record opr
INNER JOIN ovst o ON opr.vn = o.vn
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
GROUP BY opr.sex
```
*(Same on both databases)*

### Age Group Distribution

**MySQL** (primary from `patient`):
```sql
SELECT
  CASE
    WHEN TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) < 1 THEN 'Infant'
    WHEN TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) < 13 THEN 'Child'
    WHEN TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) < 20 THEN 'Teenager'
    WHEN TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) < 40 THEN 'Young Adult'
    WHEN TIMESTAMPDIFF(YEAR, p.birthday, CURDATE()) < 60 THEN 'Middle Age'
    ELSE 'Senior'
  END as age_group,
  COUNT(*) as count
FROM patient p
INNER JOIN ovst o ON p.hn = o.hn
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
  AND p.birthday IS NOT NULL
GROUP BY age_group
```

**PostgreSQL** (primary from `patient`):
```sql
SELECT
  CASE
    WHEN EXTRACT(YEAR FROM AGE(p.birthday)) < 1 THEN 'Infant'
    WHEN EXTRACT(YEAR FROM AGE(p.birthday)) < 13 THEN 'Child'
    WHEN EXTRACT(YEAR FROM AGE(p.birthday)) < 20 THEN 'Teenager'
    WHEN EXTRACT(YEAR FROM AGE(p.birthday)) < 40 THEN 'Young Adult'
    WHEN EXTRACT(YEAR FROM AGE(p.birthday)) < 60 THEN 'Middle Age'
    ELSE 'Senior'
  END as age_group,
  COUNT(*) as count
FROM patient p
INNER JOIN ovst o ON p.hn = o.hn
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
  AND p.birthday IS NOT NULL
GROUP BY age_group
```

Fallback: Replace `patient p ... ON p.hn = o.hn` with `ovst_patient_record opr ... ON opr.vn = o.vn` and use `opr.birthday`.

### Patient Type Distribution

```sql
SELECT pt.pttype, pt.name as pttype_name, COUNT(*) as visit_count
FROM ovst o
LEFT JOIN pttype pt ON o.pttype = pt.pttype
WHERE o.vstdate >= :start_date AND o.vstdate <= :end_date
GROUP BY pt.pttype, pt.name
ORDER BY visit_count DESC
```
*(Same on both databases)*

## Database Type Detection

```sql
SELECT VERSION() as version
```

**Detection logic**:
- If result contains 'mysql' or 'mariadb' → `mysql`
- If result contains 'postgresql' or 'postgres' → `postgresql`
- Otherwise → default to `mysql`

**Verified result**: PostgreSQL returns `"PostgreSQL 16.4 (Debian 16.4-1.pgdg120+2)..."`

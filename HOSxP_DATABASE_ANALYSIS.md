# HOSxP Database Analysis
## Hospital Management System (HIS) Structure

> **Source**: Analyzed from BMS Session API specifications and KPI Dashboard service queries
> **Access**: Read-only via REST API (`/api/sql`)
> **Databases**: MySQL 5.7+, MariaDB 10.2+, PostgreSQL 9.6+

---

## Core Data Entities

### 1. **PATIENT** - Patient Demographics & Registration
Master table containing all patient information.

| Column | Type | Purpose |
|--------|------|---------|
| `hos_guid` | UUID | Primary key |
| `hn` | VARCHAR(9) | **Hospital Number** (unique identifier) |
| `pname` | VARCHAR(25) | Name prefix (นาย/นางสาว/etc.) |
| `fname` | VARCHAR(100) | First name |
| `lname` | VARCHAR(100) | Last name |
| `sex` | CHAR(1) | Gender (1=Male, 2=Female) |
| `birthday` | DATE | Date of birth |
| `bloodgrp` | VARCHAR(20) | Blood type |
| `pttype` | CHAR(2) | Patient type code (ref: pttype) |
| `nationality` | CHAR(3) | Nationality code |
| `religion` | CHAR(2) | Religion code |
| `occupation` | VARCHAR(4) | Occupation code |
| `firstday` | DATE | First registration date |
| `last_visit` | DATE | Last visit date |
| `last_update` | DATETIME | Record update timestamp |

**Key Relationship**: `hn` links to all visit and admission records

---

### 2. **OVST** - Outpatient Visits (OPD - ผู้ป่วยนอก)
Records every outpatient clinic visit.

| Column | Type | Purpose |
|--------|------|---------|
| `hos_guid` | UUID | Primary key |
| `vn` | VARCHAR | **Visit Number** (unique) |
| `hn` | VARCHAR | Patient HN (FK → patient) |
| `vstdate` | DATE | Visit date |
| `vsttime` | TIME | Visit time (HH:mm:ss) |
| `doctor` | VARCHAR | Doctor code (FK → doctor) |
| `spclty` | CHAR | Specialty code (FK → spclty) |
| `cur_dep` | CHAR | Current department (FK → kskdepartment) |
| `pttype` | CHAR(2) | Patient type |
| `main_dep` | CHAR | Main department |
| `staff` | VARCHAR | Registration staff ID |

**Usage**: OPD statistics, daily visit counts, department workload

---

### 3. **IPT** - Inpatient Census (ผู้ป่วยใน)
Inpatient admission and discharge records.

| Column | Type | Purpose |
|--------|------|---------|
| `hos_guid` | UUID | Primary key |
| `an` | VARCHAR | **Admission Number** |
| `hn` | VARCHAR | Patient HN (FK → patient) |
| `regdate` | DATE | Admission date |
| `regtime` | TIME | Admission time |
| `ward` | CHAR | Ward code (FK → ward) |
| `bed` | VARCHAR | Bed number |
| `dchdate` | DATE | Discharge date (NULL if still admitted) |
| `dchtime` | TIME | Discharge time |
| `confirm_discharge` | CHAR(1) | Discharge status ('Y'=discharged, 'N'=still admitted) |
| `diagnose` | VARCHAR | Primary diagnosis |
| `doctor` | VARCHAR | Attending doctor (FK → doctor) |

**Key Query**:
- **Current Census**: `WHERE confirm_discharge = 'N'`
- **Today's Admits**: `WHERE regdate = CURDATE()`
- **Today's Discharges**: `WHERE dchdate = CURDATE()`

---

### 4. **ER_REGIST** - Emergency Room Visits (ห้องฉุกเฉิน)
Emergency department patient records with triage classification.

| Column | Type | Purpose |
|--------|------|---------|
| `hos_guid` | UUID | Primary key |
| `vn` | VARCHAR | Visit number |
| `hn` | VARCHAR | Patient HN (FK → patient) |
| `vstdate` | DATE | Visit date |
| `vsttime` | TIME | Visit time |
| `er_emergency_type` | CHAR | Triage code (FK → er_emergency_type) |
| `er_status` | CHAR | ER status |
| `doctor` | VARCHAR | ER doctor code |

**Triage Classification** (via `er_emergency_type.export_code`):
- **'1'** - Red (แดง) - Crisis / Life-threatening
- **'2'** - Pink (ชมพู) - Emergent / Urgent
- **'3'** - Yellow (เหลือง) - Urgent / Potentially serious
- **'4'** - Green (เขียว) - Less urgent
- **'5' or NULL** - White (ขาว) - Non-urgent

---

### 5. **WARD** - Hospital Wards
Ward/room allocation and capacity information.

| Column | Type | Purpose |
|--------|------|---------|
| `ward` | CHAR | Ward code (primary key) |
| `name` | VARCHAR | Ward name |
| `ward_active` | CHAR(1) | Active status (Y/N) |
| `bedcount` | INT | Total beds in ward |
| `department_code` | CHAR | Department code |

**Usage**: Bed availability, ward census reports

---

## Reference/Master Tables

### 6. **KSKDEPARTMENT** - Department Master
Department and clinic information.

| Column | Type | Purpose |
|--------|------|---------|
| `depcode` | CHAR | Department code (PK) |
| `department` | VARCHAR | Department name |
| `spclty` | CHAR | Specialty code |
| `doctor_code` | VARCHAR | Default doctor code |
| `hospital_department_id` | INT | Hospital dept ID |

**Common Joins**: `OVST.cur_dep = KSKDEPARTMENT.depcode`

---

### 7. **DOCTOR** - Physician Master
Doctor and medical staff information.

| Column | Type | Purpose |
|--------|------|---------|
| `code` | VARCHAR | Doctor code (PK) |
| `name` | VARCHAR | Full name |
| `shortname` | VARCHAR | Abbreviation |
| `licenseno` | VARCHAR | Medical license number |
| `department` | VARCHAR | Department |
| `active` | CHAR(1) | Status (Y/N) |

---

### 8. **SPCLTY** - Specialty Master
Medical specialty classification.

| Column | Type | Purpose |
|--------|------|---------|
| `spclty` | CHAR | Specialty code (PK) |
| `name` | VARCHAR | Specialty name |

---

### 9. **PTTYPE** - Patient Type Master
Patient classification (Thai nationals, foreigners, etc.).

| Column | Type | Purpose |
|--------|------|---------|
| `pttype` | CHAR(2) | Patient type code (PK) |
| `name` | VARCHAR | Patient type name |

---

### 10. **ER_EMERGENCY_TYPE** - Triage Classification
Emergency triage level definitions.

| Column | Type | Purpose |
|--------|------|---------|
| `er_emergency_type` | CHAR | Triage code (PK) |
| `export_code` | CHAR | Export code (1-5, null) |
| `name` | VARCHAR | Triage level name |

---

### 11. **ICD** - Medical Diagnosis Codes
ICD-10 diagnosis code reference.

| Column | Type | Purpose |
|--------|------|---------|
| `code` | VARCHAR | ICD code (PK) |
| `name` | VARCHAR | Diagnosis description |

---

### 12. **DRUGITEMS** - Medication Master
Pharmaceutical inventory and catalog.

| Column | Type | Purpose |
|--------|------|---------|
| `code` | VARCHAR | Drug code (PK) |
| `name` | VARCHAR | Drug name |
| `strength` | VARCHAR | Drug strength |

---

## Reporting/Aggregate Tables

### 13. **WARD_ADMIT_SNAPSHOT** - Historical IPD Census
Daily snapshot of inpatient census (for trending).

| Column | Type | Purpose |
|--------|------|---------|
| `snap_date` | DATE | Date of snapshot |
| `ward` | CHAR | Ward code |
| `total_count` | INT | Patient count on that date |

**Usage**: Yesterday's census comparison, IPD trends

---

### 14. **OVSTDIAG** - Outpatient Diagnoses
Diagnosis codes recorded during outpatient visits.

| Column | Type | Purpose |
|--------|------|---------|
| `vn` | VARCHAR | Visit number (FK → ovst) |
| `icd` | VARCHAR | ICD code (FK → icd) |
| `diag_type` | CHAR | Diagnosis type (primary/secondary) |

---

### 15. **OPITEMRECE** - Outpatient Item Receipt
Pharmacy/item receipt from OPD visits.

| Column | Type | Purpose |
|--------|------|---------|
| `vn` | VARCHAR | Visit number (FK → ovst) |
| `itemcode` | VARCHAR | Item code (FK → drugitems) |
| `qty` | INT | Quantity dispensed |
| `docno` | VARCHAR | Document number |

---

### 16. **OAPP** - Outpatient Appointment
Scheduled appointments for OPD clinics.

| Column | Type | Purpose |
|--------|------|---------|
| `hn` | VARCHAR | Patient HN (FK → patient) |
| `depcode` | CHAR | Department code (FK → kskdepartment) |
| `nextdate` | DATE | Next appointment date |
| `status` | CHAR | Appointment status |

---

### 17. **OVST_PATIENT_RECORD** - Extended Visit Records
Extended patient health records attached to visits.

| Column | Type | Purpose |
|--------|------|---------|
| `vn` | VARCHAR | Visit number (FK → ovst) |
| `vital_signs` | JSON/TEXT | Vital signs recorded |
| `notes` | TEXT | Clinical notes |

---

### 18. **DEATH** - Mortality Records
Patient death records and outcomes.

| Column | Type | Purpose |
|--------|------|---------|
| `hos_guid` | UUID | PK |
| `hn` | VARCHAR | Patient HN (FK → patient) |
| `death_date` | DATE | Date of death |
| `death_time` | TIME | Time of death |
| `cause` | VARCHAR | Cause of death (ICD code) |

---

## Database Relationships Map

```
┌─────────────────────────────────────────────────────────┐
│                    PATIENT (hn)                          │
│  Master registry for all individuals                     │
└────────┬────────────────────────────┬────────────────────┘
         │                            │
         ├─────────────┬──────────────┼─────────────────────┐
         │             │              │                     │
         ↓             ↓              ↓                     ↓
    ┌────────┐  ┌─────────┐  ┌──────────┐           ┌──────────┐
    │  OVST  │  │   IPT   │  │ER_REGIST│           │  DEATH   │
    │ (OPD)  │  │(Inpat)  │  │  (ER)   │           │ (Deaths) │
    └────────┘  └─────────┘  └──────────┘           └──────────┘
         │           │             │
    ┌────┴────┐  ┌────┴────┐  ┌────┴──────┐
    │          │  │         │  │            │
    ↓          ↓  ↓         ↓  ↓            ↓
┌─────────┐ ┌──────┐ ┌─────┐ ┌──────┐ ┌─────────┐
│DOCTOR   │ │WARD  │ │WARD │ │DOCTOR│ │EMERGENCY│
│         │ │      │ │ADMIT│ │      │ │ TYPE    │
└─────────┘ │SNAP  │ │SNAP │ └──────┘ └─────────┘
            │SHOT  │ │     │
            └──────┘ └─────┘

┌──────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
│SPCLTY    │ │KSKDEPT      │ │PTTYPE    │ │ICD       │
│(Specialty)│ │(Department) │ │(PatType) │ │(Diagnosis)│
└──────────┘ └─────────────┘ └──────────┘ └──────────┘
     ↑             ↑               ↑            ↑
     └─────┬───────┴───────────────┼────────────┘
           │                       │
      ┌─────┴────┐         ┌──────┴──────┐
      │   OVST   │         │OVSTDIAG     │
      │           │         │(Diagnoses) │
      └──────────┘         └─────────────┘
```

---

## Common Query Patterns

### 1. Daily OPD Statistics
```sql
SELECT COUNT(*) as visits
FROM ovst
WHERE vstdate = CURDATE()
```

### 2. Department Workload
```sql
SELECT
  k.department,
  COUNT(*) as visit_count
FROM ovst o
LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode
WHERE o.vstdate = CURDATE()
GROUP BY k.department
ORDER BY visit_count DESC
```

### 3. Current IPD Census
```sql
SELECT COUNT(*) as current_census
FROM ipt
WHERE confirm_discharge = 'N'
```

### 4. IPD by Ward
```sql
SELECT
  w.name as ward_name,
  COUNT(*) as patient_count,
  w.bedcount
FROM ipt i
LEFT JOIN ward w ON i.ward = w.ward
WHERE i.confirm_discharge = 'N'
GROUP BY w.name, w.bedcount
ORDER BY patient_count DESC
```

### 5. ER Triage Breakdown
```sql
SELECT
  et.export_code,
  et.name,
  COUNT(*) as count
FROM er_regist er
LEFT JOIN er_emergency_type et ON er.er_emergency_type = et.er_emergency_type
WHERE er.vstdate = CURDATE()
GROUP BY et.export_code, et.name
ORDER BY et.export_code
```

### 6. Doctor Workload
```sql
SELECT
  d.code,
  d.name,
  COUNT(*) as patient_count
FROM ovst o
LEFT JOIN doctor d ON o.doctor = d.code
WHERE o.vstdate = CURDATE()
GROUP BY d.code, d.name
ORDER BY patient_count DESC
```

### 7. Hourly Distribution
```sql
SELECT
  HOUR(vsttime) as hour,
  COUNT(*) as visits
FROM ovst
WHERE vstdate = CURDATE()
GROUP BY HOUR(vsttime)
ORDER BY hour
```

### 8. Weekly Trend
```sql
SELECT
  vstdate,
  COUNT(*) as visit_count
FROM ovst
WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY vstdate
ORDER BY vstdate
```

---

## Data Security & Privacy Notes

### Blacklisted Tables (No Access)
- `opduser` - Staff credentials
- `opdconfig` - System configuration
- `sys_var` - System variables
- `user_var` - User settings
- `user_jwt` - Authentication tokens

### Query Restrictions
- Maximum 20 tables per query
- No cross-database queries (no dots in table names)
- Only SELECT, DESCRIBE, EXPLAIN, SHOW, WITH statements
- SQL injection prevention via parameter binding

### Data Privacy Best Practices
✅ **Use aggregates** (COUNT, SUM, AVG) instead of individual records
✅ **Avoid PII retrieval** (CID, full names, addresses) unless necessary
✅ **Use grouping** for demographic breakdowns
✅ **Anonymize output** for public dashboards
❌ **Don't expose** patient HN, patient names in public views
❌ **Don't retrieve** sensitive medical records for trending

---

## Database Performance Considerations

### Indexing Strategy
Common indexed columns:
- `patient.hn` (primary key)
- `ovst.vstdate` (date filtering)
- `ovst.hn` (patient lookup)
- `ipt.confirm_discharge` (census queries)
- `ipt.regdate`, `ipt.dchdate` (admission/discharge filtering)
- `er_regist.vstdate` (ER reporting)

### Query Optimization Tips
1. **Add LIMIT** for large result sets
2. **Use date range filtering** (`vstdate >= DATE(...)`)
3. **Leverage composite indexes** on frequently joined columns
4. **Use aggregates** rather than client-side grouping
5. **Cache results** when historical data doesn't change

---

## Database Type Compatibility

| Feature | MySQL 5.7 | MySQL 8.0 | MariaDB 10.2 | PostgreSQL |
|---------|-----------|-----------|--------------|-----------|
| CTEs | ❌ | ✅ | ✅ | ✅ |
| Window Functions | ✅ | ✅ | ✅ | ✅ |
| JSON | ✅ | ✅ | ✅ | ✅ |
| Date Functions | ✅ | ✅ | ✅ | ✅ |
| CASE Statements | ✅ | ✅ | ✅ | ✅ |

**PostgreSQL Note**: Use single quotes for strings: `WHERE hn = '12345'` (not double quotes)

---

## Related HOSxP Modules

This database structure supports:
- **OPD (Outpatient Department)** - OVST, OVSTDIAG, OAPP
- **IPD (Inpatient Department)** - IPT, WARD, WARD_ADMIT_SNAPSHOT
- **ER (Emergency Room)** - ER_REGIST, ER_EMERGENCY_TYPE
- **Pharmacy** - DRUGITEMS, OPITEMRECE
- **Medical Records** - OVST_PATIENT_RECORD, OVSTDIAG
- **Mortality Tracking** - DEATH
- **Staff Management** - DOCTOR, SPCLTY (referenced by session API)

---

## Summary

The HOSxP database is a comprehensive hospital information system designed around:
1. **Patient-centric** data model (HN as universal identifier)
2. **Visit-based** recording (OVST for OPD, IPT for admission)
3. **Departmental structure** (KSKDEPARTMENT, WARD)
4. **Clinical classification** (ICD diagnoses, triage levels)
5. **Audit trail** with timestamps on all records

**Total documented tables**: 18+ core entities
**Primary access pattern**: Time-based filtering (vstdate, regdate)
**Typical use case**: Daily operational dashboards, trend analysis, workload reporting

---

*Analysis updated: 2026-03-23*
*API Version: BMS Session v2.0*

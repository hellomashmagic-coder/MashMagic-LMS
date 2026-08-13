# Mash Magic LMS — Database Architecture Specification

**Version**: 1.0.0  
**Database System**: MySQL 8.0+  
**ORM / Driver**: Raw `mysql2/promise` with Connection Pool  

---

## 1. Overview & Core Philosophy

The **Mash Magic LMS** database model is structured around **student centricity**, linking students to mentors, faculties, academic heads, and operations staff. The database leverages **raw SQL with connection pooling (`mysql2`)** for high efficiency, strict referential integrity, and predictable query performance.

---

## 2. Table Catalog & Domain Grouping

### 2.1 Core User & Identity Management
- **`users`**: Global authentication repository storing credentials, roles, status, and extended user attributes.
- **`students`**: Detailed profile records for enrolled students (registration number, grade, course, assigned mentor, parent contact info, enrollment status, soft delete flags).
- **`mentors`**: Mentor profiles, assigned student counts, specialization, and status.
- **`faculties`**: Faculty profiles, assigned subjects, qualifications, hourly rates, and status.

### 2.2 Academic Operations & Timetable
- **`timetable`**: Daily/weekly scheduled class sessions connecting `student_id`, `faculty_id`, `mentor_id`, subject, time ranges (`start_time`, `end_time`), meeting link, and session status (`scheduled`, `completed`, `cancelled`, `rescheduled`).
- **`faculty_schedules`**: Master recurring schedule template entries per faculty member.
- **`faculty_timetable`**: Individual slot allocations for faculty load tracking.
- **`aoe_demo_schedules`**: Operational demo class tracking for prospective students.

### 2.3 Micro-Mentorship & Feedback System
- **`student_interaction_logs`**: Logs recorded by mentors during micro-mentorship sessions (connection channel, duration, student mood, academic concerns, action items, follow-up date).
- **`mentor_session_logs`**: Micro-mentorship check-in records.
- **`mentor_faculty_interactions`**: Communication logs between mentors and faculty regarding student progress.
- **`faculty_interaction_logs`**: Classroom observations recorded by faculty for individual students.
- **`mentor_reviews`**: Periodic performance reviews of mentors conducted by Mentor Heads.

### 2.4 Assessments & Examinations
- **`student_exams`**: Scheduled diagnostic, periodic, and final exams (exam name, subject, date, total marks, pass marks).
- **`student_marks`**: Exam score records (`exam_id`, `student_id`, `subject`, `marks_obtained`, `grade`, `remarks`).

### 2.5 Financial & Installments Management
- **`student_installments`**: Fee breakdown per student (`student_id`, `installment_number`, `amount_due`, `due_date`, `amount_paid`, `paid_date`, `status`).

### 2.6 Audit, Security & Recovery
- **`audit_logs`**: Full audit history of entity mutations (`table_name`, `record_id`, `action_type`, `old_data`, `new_data`, `performed_by`, `role`, `created_at`).
- **`student_archive`**, **`timetable_archive`**: Recovery archives for historical data retention.

---

## 3. Entity Relationship Diagram (Conceptual)

```
        +---------------+
        |     users     |
        +-------+-------+
                | (role-based split)
  +-------------+-------------+
  |             |             |
  v             v             v
+----------+  +----------+  +-----------+
| students |  | mentors  |  | faculties |
+----+-----+  +----+-----+  +-----+-----+
     |             |              |
     +------+------+              |
            | (assigned mentor)   |
            v                     |
      +-----------+               |
      | timetable | <-------------+ (session faculty)
      +-----+-----+
            |
            +-----------------------+
            |                       |
            v                       v
+------------------------+  +---------------+
| student_interaction_    |  | student_marks |
| logs (micro-mentorship)|  +---------------+
+------------------------+
```

---

## 4. Indexing & Optimization Strategy

To support high-concurrency dashboards and server-side paginated queries, the following indexes are required:

1. **`students`**:
   - `INDEX idx_students_status_deleted (status, is_deleted)`
   - `INDEX idx_students_mentor (mentor_id)`
   - `INDEX idx_students_reg (registration_number)`
2. **`timetable`**:
   - `INDEX idx_timetable_date_student (date, student_id)`
   - `INDEX idx_timetable_date_faculty (date, faculty_id)`
   - `INDEX idx_timetable_range (date, start_time, end_time)`
3. **`student_interaction_logs`**:
   - `INDEX idx_logs_student_date (student_id, date)`
   - `INDEX idx_logs_mentor_date (mentor_id, date)`
4. **`audit_logs`**:
   - `INDEX idx_audit_table_record (table_name, record_id)`
   - `INDEX idx_audit_date (created_at)`

---

## 5. Soft Deletion & Data Safety Policy

All core entities (`students`, `mentors`, `faculties`, `timetable`, `student_interaction_logs`) MUST follow uniform soft-deletion:
- Column: `is_deleted TINYINT(1) DEFAULT 0`
- Column: `deleted_at DATETIME NULL`
- Column: `deleted_by INT NULL`
- Operations MUST set `is_deleted = 1` and append an entry to `audit_logs`.
- Hard deletes (`DELETE FROM ...`) are restricted strictly to super-admin database maintenance utilities.

import sqlite3
import os
import json
import hashlib
import uuid
from datetime import datetime, date, timedelta

DB_FILE = os.path.join(os.path.dirname(__file__), "ssc_database.db")

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table (Academic Head & SSCs)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'SSC',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Sessions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

    # Students table (Permanent Identity)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        register_no TEXT UNIQUE,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        board TEXT,
        school TEXT,
        parent_name TEXT NOT NULL,
        parent_phone TEXT NOT NULL,
        student_phone TEXT,
        preferred_language TEXT NOT NULL DEFAULT 'English',
        program TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        preferred_time TEXT,
        session_package INTEGER NOT NULL DEFAULT 24,
        sessions_completed INTEGER NOT NULL DEFAULT 0,
        faculty_id INTEGER,
        assigned_ssc_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_ssc_id) REFERENCES users (id)
    )
    ''')

    # Migration check for existing SQLite databases
    cursor.execute("PRAGMA table_info(students)")
    existing_cols = [r['name'] for r in cursor.fetchall()]
    if 'register_no' not in existing_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN register_no TEXT")
    if 'preferred_language' not in existing_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN preferred_language TEXT DEFAULT 'English'")

    # Backfill register_no if missing
    cursor.execute("SELECT id FROM students WHERE register_no IS NULL OR register_no = '' ORDER BY id ASC")
    unregistered = cursor.fetchall()
    for row in unregistered:
        reg_str = f"MM-2026-{row['id']:04d}"
        cursor.execute("UPDATE students SET register_no = ? WHERE id = ?", (reg_str, row['id']))

    # Student Packages / Enrollments table (One student -> Multiple packages over time)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS student_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        program TEXT NOT NULL,
        session_package INTEGER NOT NULL,
        sessions_completed INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Active',
        start_date TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )
    ''')

    # Student Subjects & Faculty Pairings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS student_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        package_id INTEGER,
        subject TEXT NOT NULL,
        faculty_id INTEGER NOT NULL,
        assigned_days TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (package_id) REFERENCES student_packages (id),
        FOREIGN KEY (faculty_id) REFERENCES faculty (id)
    )
    ''')

    # Faculty table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS faculty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        faculty_code TEXT UNIQUE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        subjects TEXT NOT NULL,
        syllabuses TEXT NOT NULL DEFAULT 'CBSE, ICSE',
        grades TEXT NOT NULL DEFAULT 'Grade 6, Grade 7, Grade 8, Grade 9, Grade 10',
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Migration check for faculty table
    cursor.execute("PRAGMA table_info(faculty)")
    fac_cols = [r['name'] for r in cursor.fetchall()]
    if 'faculty_code' not in fac_cols:
        cursor.execute("ALTER TABLE faculty ADD COLUMN faculty_code TEXT")
    if 'syllabuses' not in fac_cols:
        cursor.execute("ALTER TABLE faculty ADD COLUMN syllabuses TEXT DEFAULT 'CBSE, ICSE'")
    if 'grades' not in fac_cols:
        cursor.execute("ALTER TABLE faculty ADD COLUMN grades TEXT DEFAULT 'Grade 6, Grade 7, Grade 8, Grade 9, Grade 10'")
    if 'updated_at' not in fac_cols:
        cursor.execute("ALTER TABLE faculty ADD COLUMN updated_at DATETIME")

    # Backfill missing faculty_code values
    cursor.execute("SELECT id FROM faculty WHERE faculty_code IS NULL OR faculty_code = '' ORDER BY id ASC")
    uncoded_fac = cursor.fetchall()
    for row in uncoded_fac:
        f_code = f"FAC-2026-{row['id']:04d}"
        cursor.execute("UPDATE faculty SET faculty_code = ? WHERE id = ?", (f_code, row['id']))

    # Weekly Timetable table (Master schedule template)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS weekly_timetables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        faculty_id INTEGER NOT NULL,
        day_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration INTEGER DEFAULT 60,
        meeting_link TEXT,
        effective_from TEXT NOT NULL,
        effective_until TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (faculty_id) REFERENCES faculty (id)
    )
    ''')

    # Classes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        faculty_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        duration INTEGER DEFAULT 60,
        meeting_link TEXT,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        attendance TEXT DEFAULT NULL,
        topic_covered TEXT,
        homework TEXT,
        student_performance TEXT,
        faculty_remarks TEXT,
        notes TEXT,
        weekly_timetable_id INTEGER,
        cancellation_reason TEXT,
        change_requested_by TEXT,
        original_class_id INTEGER,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (faculty_id) REFERENCES faculty (id),
        FOREIGN KEY (weekly_timetable_id) REFERENCES weekly_timetables (id)
    )
    ''')

    # Migration checks for existing classes table
    cursor.execute("PRAGMA table_info(classes)")
    cls_cols = [r['name'] for r in cursor.fetchall()]
    if 'weekly_timetable_id' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN weekly_timetable_id INTEGER")
    if 'cancellation_reason' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN cancellation_reason TEXT")
    if 'change_requested_by' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN change_requested_by TEXT")
    if 'original_class_id' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN original_class_id INTEGER")
    if 'wrapup_token' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN wrapup_token TEXT")
    if 'wrapup_status' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN wrapup_status TEXT DEFAULT 'PENDING'")
    if 'actual_start_time' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN actual_start_time TEXT")
    if 'actual_end_time' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN actual_end_time TEXT")
    if 'actual_minutes' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN actual_minutes INTEGER")
    if 'session_status' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN session_status TEXT")
    if 'homework_given' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN homework_given TEXT")
    if 'next_session_rec' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN next_session_rec TEXT")
    if 'ssc_remarks' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN ssc_remarks TEXT")
    if 'correction_reason' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN correction_reason TEXT")
    if 'verified_by' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN verified_by TEXT")
    if 'verified_at' not in cls_cols:
        cursor.execute("ALTER TABLE classes ADD COLUMN verified_at DATETIME")

    # Backfill wrapup_token for existing classes missing tokens
    cursor.execute("SELECT id FROM classes WHERE wrapup_token IS NULL OR wrapup_token = ''")
    missing_tokens = cursor.fetchall()
    for row in missing_tokens:
        tok = uuid.uuid4().hex
        cursor.execute("UPDATE classes SET wrapup_token = ? WHERE id = ?", (tok, row['id']))

    # Migration checks for student_packages table
    cursor.execute("PRAGMA table_info(student_packages)")
    pkg_cols = [r['name'] for r in cursor.fetchall()]
    if 'end_date' not in pkg_cols:
        cursor.execute("ALTER TABLE student_packages ADD COLUMN end_date TEXT")
    if 'renewal_status' not in pkg_cols:
        cursor.execute("ALTER TABLE student_packages ADD COLUMN renewal_status TEXT DEFAULT 'Pending'")
    if 'churn_reason' not in pkg_cols:
        cursor.execute("ALTER TABLE student_packages ADD COLUMN churn_reason TEXT")
    if 'churn_notes' not in pkg_cols:
        cursor.execute("ALTER TABLE student_packages ADD COLUMN churn_notes TEXT")

    # Migration checks for students table
    if 'renewal_status' not in existing_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN renewal_status TEXT DEFAULT 'Pending'")
    if 'churn_reason' not in existing_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN churn_reason TEXT")
    if 'churn_notes' not in existing_cols:
        cursor.execute("ALTER TABLE students ADD COLUMN churn_notes TEXT")

    # Backfill student_packages end_date and renewal_status if unpopulated
    cursor.execute("SELECT COUNT(*) as count FROM student_packages WHERE end_date IS NOT NULL AND end_date != ''")
    populated_pkgs = cursor.fetchone()['count']
    if populated_pkgs == 0:
        cursor.execute("SELECT id FROM students ORDER BY id ASC")
        all_students = cursor.fetchall()
        for idx, st in enumerate(all_students):
            st_id = st['id']
            if idx < 12:
                end_d = f"2026-09-{(idx%10)+18:02d}"
                if idx < 8:
                    r_status, c_reason = 'Renewed', None
                elif idx == 8:
                    r_status, c_reason = 'Pending', None
                else:
                    r_status, c_reason = 'Churned', 'Price / affordability' if idx == 9 else ('Academic satisfaction' if idx == 10 else 'Student discontinued')
            elif idx < 24:
                end_d = f"2026-08-{(idx%10)+15:02d}"
                if idx < 20:
                    r_status, c_reason = 'Renewed', None
                elif idx == 20:
                    r_status, c_reason = 'Pending', None
                else:
                    r_status, c_reason = 'Churned', 'Price / affordability' if idx == 21 else ('Academic satisfaction' if idx == 22 else 'Other')
            elif idx < 33:
                end_d = f"2026-07-{(idx%10)+12:02d}"
                r_status = 'Renewed' if idx < 30 else 'Churned'
                c_reason = None if r_status == 'Renewed' else 'Price / affordability'
            elif idx < 41:
                end_d = f"2026-06-{(idx%10)+10:02d}"
                r_status = 'Renewed' if idx < 39 else 'Churned'
                c_reason = None if r_status == 'Renewed' else 'Academic satisfaction'
            elif idx < 49:
                end_d = f"2026-05-{(idx%10)+10:02d}"
                r_status = 'Renewed' if idx < 47 else 'Churned'
                c_reason = None if r_status == 'Renewed' else 'Student discontinued'
            else:
                end_d = f"2026-10-{(idx%15)+1:02d}"
                r_status, c_reason = 'Pending', None

            cursor.execute("SELECT id FROM student_packages WHERE student_id = ? ORDER BY id DESC LIMIT 1", (st_id,))
            pkg_row = cursor.fetchone()
            if pkg_row:
                cursor.execute("""
                    UPDATE student_packages 
                    SET end_date=?, renewal_status=?, churn_reason=? 
                    WHERE id=?
                """, (end_d, r_status, c_reason, pkg_row['id']))
            else:
                cursor.execute("""
                    INSERT INTO student_packages (student_id, program, session_package, sessions_completed, status, start_date, end_date, renewal_status, churn_reason, notes)
                    VALUES (?, 'Classmate 1-on-1', 24, 12, 'Active', '2026-06-01', ?, ?, ?, 'Seeded package')
                """, (st_id, end_d, r_status, c_reason))
            
            cursor.execute("UPDATE students SET renewal_status=?, churn_reason=? WHERE id=?", (r_status, c_reason, st_id))

    # Class History table (Audit log of every change to a class occurrence)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS class_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_occurrence_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_date TEXT,
        old_time TEXT,
        new_date TEXT,
        new_time TEXT,
        requested_by TEXT,
        reason TEXT,
        changed_by TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_occurrence_id) REFERENCES classes (id)
    )
    ''')

    # Rescheduling requests table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rescheduling_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        original_date TEXT NOT NULL,
        original_time TEXT NOT NULL,
        suggested_date TEXT NOT NULL,
        suggested_time TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id),
        FOREIGN KEY (student_id) REFERENCES students (id)
    )
    ''')

    # Assessments table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        faculty_id INTEGER,
        duration INTEGER DEFAULT 45,
        status TEXT NOT NULL DEFAULT 'Scheduled',
        score REAL,
        max_score REAL,
        percentage REAL,
        faculty_remark TEXT,
        ssc_remark TEXT,
        notes TEXT,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )
    ''')

    # Follow-ups table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        due_date TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium',
        notes TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )
    ''')

    # Feedback table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        feedback_type TEXT NOT NULL,
        date TEXT NOT NULL,
        rating_status TEXT NOT NULL,
        comments TEXT,
        follow_up_required INTEGER DEFAULT 0,
        submitted_by TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (id)
    )
    ''')

    # Activity Log table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        actor_user_id INTEGER,
        activity_type TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT DEFAULT 'System',
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
    )
    ''')

    conn.commit()
    conn.close()

def seed_data():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()['count'] > 0:
        conn.close()
        return

    # Seed Users
    pass_head = hash_password("admin123")
    pass_ssc = hash_password("ssc123")

    users_data = [
        ("Dr. Vikram Malhotra", "head@mashmagic.com", "+919811001100", pass_head, "ACADEMIC_HEAD", "Active"),
        ("Ananya Sharma", "ananya@mashmagic.com", "+919811001101", pass_ssc, "SSC", "Active"),
        ("Riya Thomas", "riya@mashmagic.com", "+919811001102", pass_ssc, "SSC", "Active"),
        ("Ameen K", "ameen@mashmagic.com", "+919811001103", pass_ssc, "SSC", "Active"),
    ]
    cursor.executemany('''
    INSERT INTO users (name, email, phone, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', users_data)

    head_user_id = 1
    ssc1_id = 2
    ssc2_id = 3
    ssc3_id = 4

    # Seed Faculty with faculty_code, subjects, phone, syllabuses, grades, status
    faculty_members = [
        ("FAC-2026-0001", "Rahul Verma", "+919876543210", "Mathematics, Physics", "CBSE, ICSE", "Grade 6, Grade 7, Grade 8, Grade 9, Grade 10", "Active"),
        ("FAC-2026-0002", "Priya Nair", "+919876543211", "English, Humanities", "CBSE, ICSE, State", "Grade 5, Grade 6, Grade 7, Grade 8, Grade 9, Grade 10", "Active"),
        ("FAC-2026-0003", "Siddharth Roy", "+919876543212", "Science, Chemistry", "CBSE, IGCSE", "Grade 6, Grade 7, Grade 8, Grade 9, Grade 10, Grade 11", "Active"),
        ("FAC-2026-0004", "Ananya Iyer", "+919876543213", "Mathematics, Logic", "CBSE, IB", "Grade 8, Grade 9, Grade 10, Grade 11, Grade 12", "Active"),
        ("FAC-2026-0005", "Karan Mehta", "+919876543214", "Biology, Science", "CBSE, State", "Grade 7, Grade 8, Grade 9, Grade 10, Higher Secondary", "Active"),
        ("FAC-2026-0006", "Neha Gupta", "+919876543215", "English, Social Studies", "CBSE, ICSE", "Grade 5, Grade 6, Grade 7, Grade 8, Grade 9, Grade 10", "Active")
    ]
    cursor.executemany('''
    INSERT INTO faculty (faculty_code, name, phone, subjects, syllabuses, grades, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', faculty_members)

    today_str = date.today().isoformat()
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
    in_2_days = (date.today() + timedelta(days=2)).isoformat()

    first_names = ["Ayaan", "Ananya", "Rohan", "Diya", "Kabir", "Isha", "Vihaan", "Tara", "Aarav", "Myra",
                   "Dev", "Riya", "Aditya", "Sanya", "Arjun", "Anika", "Kavya", "Dhruv", "Zara", "Yash",
                   "Siddharth", "Avani", "Karan", "Tanvi", "Pranav", "Meera", "Ishaan", "Rhea", "Nikhil", "Pari",
                   "Sameer", "Jiya", "Tanish", "Sanika", "Samarth", "Shruti", "Rishabh", "Sneha", "Varun", "Simran",
                   "Vedic", "Natasha", "Aayush", "Bhavya", "Harsh", "Gauri", "Shlok", "Srishti", "Madhav", "Khushi",
                   "Parth", "Aditi", "Manan", "Bhumika", "Tejas", "Juhi", "Om", "Nisha", "Rehaan", "Sonal"]
    
    last_names = ["Sharma", "Patel", "Verma", "Rao", "Gupta", "Deshmukh", "Joshi", "Kapoor", "Chawla", "Bhasin",
                  "Malhotra", "Mehta", "Iyer", "Nair", "Reddy", "Kulkarni", "Bhat", "Sen", "Roy", "Agarwal"]
    
    boards = ["CBSE", "ICSE", "IB", "IGCSE", "State Board"]
    schools = ["Delhi Public School", "Orchid International", "Ryan International", "The Doon School", "Oakridge International", "EuroSchool"]
    languages = [
        "English",
        "More English, Less Malayalam",
        "More Malayalam, Less English",
        "Malayalam",
        "Hindi",
        "Tamil"
    ]

    # Seed 60 Students with Auto Register Numbers MM-2026-0001 .. MM-2026-0060
    students_data = []
    packages_data = []
    subjects_data = []

    for i in range(60):
        fn = first_names[i]
        ln = last_names[i % len(last_names)]
        name = f"{fn} {ln}"
        reg_no = f"MM-2026-{i+1:04d}"
        grade = f"Grade {8 if i % 3 == 0 else (7 if i % 3 == 1 else 9)}"
        board = boards[i % len(boards)]
        school = schools[i % len(schools)]
        parent_name = f"Mr./Mrs. {ln}"
        parent_phone = f"+9198{i:02d}112233"
        student_phone = f"+9197{i:02d}445566" if i % 2 == 0 else ""
        lang = languages[i % len(languages)]
        program = "Classmate 1-on-1" if i % 2 == 0 else "Intensive Academic Support"
        status = "Active" if i < 52 else ("On Hold" if i < 56 else ("Completed" if i < 58 else "Dropped"))
        preferred_time = "4:00 PM" if i % 4 == 0 else ("5:00 PM" if i % 4 == 1 else ("6:00 PM" if i % 4 == 2 else "7:00 PM"))
        package = 24
        completed = min(package, (i * 3 + 5) % 24)
        faculty_id = (i % len(faculty_members)) + 1

        if i < 24:
            ssc_id = ssc1_id
        elif i < 44:
            ssc_id = ssc2_id
        elif i < 57:
            ssc_id = ssc3_id
        else:
            ssc_id = None

        students_data.append((
            reg_no, name, grade, board, school, parent_name, parent_phone, student_phone, lang,
            program, status, preferred_time, package, completed, faculty_id, ssc_id
        ))

        # Initial Active Package with calculated end date and renewal status
        st_id = i + 1
        
        # Distribute end dates across months for robust metric testing
        if i < 12:
            # Ending in Sept 2026 (This Month)
            end_d = f"2026-09-{(i%10)+18:02d}"
            if i < 8:
                r_status = 'Renewed'
                c_reason = None
            elif i == 8:
                r_status = 'Pending'
                c_reason = None
            else:
                r_status = 'Churned'
                c_reason = 'Price / affordability' if i == 9 else ('Academic satisfaction' if i == 10 else 'Student discontinued')
        elif i < 24:
            # Ending in Aug 2026 (Last Month)
            end_d = f"2026-08-{(i%10)+15:02d}"
            if i < 20:
                r_status = 'Renewed'
                c_reason = None
            elif i == 20:
                r_status = 'Pending'
                c_reason = None
            else:
                r_status = 'Churned'
                c_reason = 'Price / affordability' if i == 21 else ('Academic satisfaction' if i == 22 else 'Other')
        elif i < 33:
            # Ending in July 2026
            end_d = f"2026-07-{(i%10)+12:02d}"
            r_status = 'Renewed' if i < 30 else 'Churned'
            c_reason = None if r_status == 'Renewed' else 'Price / affordability'
        elif i < 41:
            # Ending in June 2026
            end_d = f"2026-06-{(i%10)+10:02d}"
            r_status = 'Renewed' if i < 39 else 'Churned'
            c_reason = None if r_status == 'Renewed' else 'Academic satisfaction'
        elif i < 49:
            # Ending in May 2026
            end_d = f"2026-05-{(i%10)+10:02d}"
            r_status = 'Renewed' if i < 47 else 'Churned'
            c_reason = None if r_status == 'Renewed' else 'Student discontinued'
        else:
            # Ending in Oct 2026 (Upcoming)
            end_d = f"2026-10-{(i%15)+1:02d}"
            r_status = 'Pending'
            c_reason = None

        packages_data.append((st_id, program, package, completed, 'Active', '2026-06-01', end_d, r_status, c_reason, 'Initial enrollment package'))

        # Subject-Faculty Pairings
        subj1 = "Mathematics" if i % 2 == 0 else "English"
        fac1_id = (i % len(faculty_members)) + 1
        days1 = "Mon / Wed / Fri"

        subj2 = "Science" if i % 2 == 0 else "Humanities"
        fac2_id = ((i + 1) % len(faculty_members)) + 1
        days2 = "Tue / Thu / Sat"

        subjects_data.append((st_id, st_id, subj1, fac1_id, days1))
        subjects_data.append((st_id, st_id, subj2, fac2_id, days2))

    cursor.executemany('''
    INSERT INTO students (
        register_no, name, grade, board, school, parent_name, parent_phone, student_phone, preferred_language,
        program, status, preferred_time, session_package, sessions_completed, faculty_id, assigned_ssc_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', students_data)

    cursor.executemany('''
    INSERT INTO student_packages (student_id, program, session_package, sessions_completed, status, start_date, end_date, renewal_status, churn_reason, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', packages_data)

    cursor.executemany('''
    INSERT INTO student_subjects (student_id, package_id, subject, faculty_id, assigned_days)
    VALUES (?, ?, ?, ?, ?)
    ''', subjects_data)

    # Seed Master Weekly Timetables (e.g. Student 1 Ayaan Sharma)
    weekly_slots_seed = [
        (1, "Mathematics", 1, "Monday", "04:00 PM", 60, "https://meet.google.com/abc-defg-hij", "2026-09-01", "Active"),
        (1, "Mathematics", 1, "Wednesday", "04:00 PM", 60, "https://meet.google.com/abc-defg-hij", "2026-09-01", "Active"),
        (1, "Science", 2, "Tuesday", "05:00 PM", 60, "https://meet.google.com/xyz-uvwx-rst", "2026-09-01", "Active"),
        (1, "Science", 2, "Thursday", "05:00 PM", 60, "https://meet.google.com/xyz-uvwx-rst", "2026-09-01", "Active"),
    ]
    cursor.executemany('''
    INSERT INTO weekly_timetables (student_id, subject, faculty_id, day_of_week, start_time, duration, meeting_link, effective_from, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', weekly_slots_seed)

    # Seed Classes, Rescheduling, Assessments, Followups, Feedback, Activity Log
    today_classes = [
        (1, 1, "Mathematics", today_str, "04:00 PM", 60, "https://meet.google.com/abc-defg-hij", "Scheduled", None),
        (2, 2, "English", today_str, "04:00 PM", 60, "https://meet.google.com/xyz-uvwx-rst", "Completed", "Present"),
        (3, 3, "Science", today_str, "04:30 PM", 60, "https://meet.google.com/lmn-opqr-stu", "Scheduled", None),
        (4, 4, "Mathematics", today_str, "04:30 PM", 60, "https://meet.google.com/aaa-bbb-ccc", "Scheduled", None),
        (5, 5, "Biology", today_str, "05:00 PM", 60, "https://meet.google.com/ddd-eee-fff", "Scheduled", None),
        (6, 6, "Social Studies", today_str, "05:00 PM", 60, "https://meet.google.com/ggg-hhh-iii", "Completed", "Present"),
        (7, 1, "Physics", today_str, "05:30 PM", 60, "https://meet.google.com/jjj-kkk-lll", "Scheduled", None),
        (8, 2, "English", today_str, "05:30 PM", 60, "https://meet.google.com/mmm-nnn-ooo", "Scheduled", None),
        (9, 3, "Chemistry", today_str, "06:00 PM", 60, "https://meet.google.com/ppp-qqq-rrr", "Scheduled", None),
        (10, 4, "Mathematics", today_str, "06:00 PM", 60, "https://meet.google.com/sss-ttt-uuu", "Scheduled", None),
        (25, 5, "Science", today_str, "06:30 PM", 60, "https://meet.google.com/vvv-www-xxx", "Scheduled", None),
        (26, 6, "English", today_str, "06:30 PM", 60, "https://meet.google.com/yyy-zzz-111", "Scheduled", None),
    ]
    cursor.executemany('''
    INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, attendance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', today_classes)

    rescheduling_data = [
        (15, 9, today_str, "06:00 PM", tomorrow_str, "06:00 PM", "Student unavailable due to school event", "Pending"),
        (3, 3, tomorrow_str, "04:30 PM", in_2_days, "05:00 PM", "Faculty emergency appointment", "Pending"),
    ]
    cursor.executemany('''
    INSERT INTO rescheduling_requests (class_id, student_id, original_date, original_time, suggested_date, suggested_time, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', rescheduling_data)

    assessments_data = [
        (1, "Mathematics", "Mid-Term Review", tomorrow_str, "05:00 PM", 1, 60, "Scheduled", None, None, None, None, None, "Covers Algebra and Geometry"),
        (2, "English", "Diagnostic Test", in_2_days, "04:00 PM", 2, 45, "Scheduled", None, None, None, None, None, "Reading comprehension & grammar"),
    ]
    cursor.executemany('''
    INSERT INTO assessments (student_id, subject, type, date, time, faculty_id, duration, status, score, max_score, percentage, faculty_remark, ssc_remark, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', assessments_data)

    followups_data = [
        (1, "Timetable", today_str, "High", "Finalize weekly slot confirmation with parent", "Pending"),
        (3, "Parent Call", today_str, "High", "Call parent regarding yesterday's rescheduling request", "Pending"),
    ]
    cursor.executemany('''
    INSERT INTO followups (student_id, type, due_date, priority, notes, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', followups_data)

    activity_data = [
        (1, head_user_id, "Student Registered", "Student registered with Register No MM-2026-0001 and assigned to Ananya Sharma.", yesterday_str, "Dr. Vikram Malhotra"),
        (1, ssc1_id, "Class Completed", "Completed Mathematics class with Rahul Verma.", yesterday_str, "Rahul Verma"),
    ]
    cursor.executemany('''
    INSERT INTO activity_log (student_id, actor_user_id, activity_type, description, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', activity_data)

    conn.commit()
    generate_monthly_occurrences(conn, 2026, 9)
    conn.close()

def generate_monthly_occurrences(conn, year, month, student_id=None):
    import calendar
    cursor = conn.cursor()
    sql = "SELECT * FROM weekly_timetables WHERE status='Active'"
    args = []
    if student_id:
        sql += " AND student_id = ?"
        args.append(student_id)
    cursor.execute(sql, args)
    slots = [dict(r) for r in cursor.fetchall()]

    days_in_month = calendar.monthrange(year, month)[1]

    day_name_map = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    }

    generated_count = 0
    for slot in slots:
        slot_day_num = day_name_map.get(slot['day_of_week'])
        if slot_day_num is None:
            continue
        
        eff_from = slot['effective_from']
        eff_until = slot['effective_until']

        for day in range(1, days_in_month + 1):
            dt = date(year, month, day)
            dt_str = dt.isoformat()

            if dt.weekday() != slot_day_num:
                continue

            if eff_from and dt_str < eff_from:
                continue
            if eff_until and dt_str > eff_until:
                continue

            # Check if class occurrence already exists for this student, date, and start_time
            cursor.execute('''
            SELECT id FROM classes
            WHERE student_id = ? AND date = ? AND start_time = ?
            ''', (slot['student_id'], dt_str, slot['start_time']))
            if cursor.fetchone():
                continue

            tok = uuid.uuid4().hex
            cursor.execute('''
            INSERT INTO classes (student_id, faculty_id, subject, date, start_time, duration, meeting_link, status, weekly_timetable_id, wrapup_token, wrapup_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, 'PENDING')
            ''', (
                slot['student_id'], slot['faculty_id'], slot['subject'],
                dt_str, slot['start_time'], slot['duration'],
                slot['meeting_link'], slot['id'], tok
            ))
            class_id = cursor.lastrowid
            generated_count += 1

            cursor.execute('''
            INSERT INTO class_history (class_occurrence_id, action, new_date, new_time, requested_by, reason, changed_by)
            VALUES (?, 'Scheduled', ?, ?, 'System', 'Generated from Weekly Timetable', 'System')
            ''', (class_id, dt_str, slot['start_time']))

    conn.commit()
    return generated_count

if __name__ == "__main__":
    init_db()
    seed_data()
    print("Database initialized with register numbers, preferred languages, and package histories successfully.")


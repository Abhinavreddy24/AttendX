BEGIN;

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_users_username
ON users(username);

CREATE INDEX IF NOT EXISTS ix_users_role
ON users(role);


-- ============================================================
-- 2. STUDENTS - ADD NEW COLUMNS
-- ============================================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS department_id INTEGER;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS face_embedding TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS ix_students_user_id
ON students(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_students_department_id
ON students(department_id);


-- ============================================================
-- 3. FACULTY - ADD NEW COLUMNS
-- ============================================================

ALTER TABLE faculty
ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE faculty
ADD COLUMN IF NOT EXISTS department_id INTEGER;

ALTER TABLE faculty
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE faculty
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS ix_faculty_user_id
ON faculty(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_faculty_department_id
ON faculty(department_id);


-- ============================================================
-- 4. COURSES / SUBJECTS
-- Keep existing courses table.
-- Existing QR sessions use course_id = 10.
-- ============================================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;


-- ============================================================
-- 5. QR SESSIONS
-- Existing QR sessions already contain course_id and faculty_id.
-- Do NOT modify or delete them.
-- ============================================================

CREATE INDEX IF NOT EXISTS ix_qr_sessions_course_id
ON qr_sessions(course_id);

CREATE INDEX IF NOT EXISTS ix_qr_sessions_faculty_id
ON qr_sessions(faculty_id);


-- ============================================================
-- 6. ENROLLMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,

    student_id INTEGER NOT NULL,

    subject_id INTEGER NOT NULL,

    academic_year VARCHAR(20),

    semester INTEGER,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_student_subject_enrollment
        UNIQUE (
            student_id,
            subject_id,
            academic_year,
            semester
        )
);

CREATE INDEX IF NOT EXISTS ix_enrollments_student_id
ON enrollments(student_id);

CREATE INDEX IF NOT EXISTS ix_enrollments_subject_id
ON enrollments(subject_id);


-- ============================================================
-- 7. FACULTY-SUBJECT MAPPING
-- ============================================================

CREATE TABLE IF NOT EXISTS faculty_subjects (
    id SERIAL PRIMARY KEY,

    faculty_id INTEGER NOT NULL,

    subject_id INTEGER NOT NULL,

    academic_year VARCHAR(20),

    semester INTEGER,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_faculty_subjects_faculty_id
ON faculty_subjects(faculty_id);

CREATE INDEX IF NOT EXISTS ix_faculty_subjects_subject_id
ON faculty_subjects(subject_id);


-- ============================================================
-- 8. ACTIVITY LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50),

    entity_id INTEGER,

    description TEXT,

    ip_address VARCHAR(100),

    device_info TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id
ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS ix_activity_logs_action
ON activity_logs(action);

CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at
ON activity_logs(created_at);


-- ============================================================
-- 9. ATTENDANCE ATTEMPTS
-- ============================================================

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS face_verified BOOLEAN;

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS gps_verified BOOLEAN;

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS qr_verified BOOLEAN;

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS result VARCHAR(30);

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);

ALTER TABLE attendance_attempts
ADD COLUMN IF NOT EXISTS device_info TEXT;

CREATE INDEX IF NOT EXISTS ix_attendance_attempts_result
ON attendance_attempts(result);


-- ============================================================
-- 10. ATTENDANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS ix_attendance_student_id
ON attendance(student_id);

CREATE INDEX IF NOT EXISTS ix_attendance_qr_session_id
ON attendance(qr_session_id);


-- ============================================================
-- 11. FOREIGN KEYS
-- Add only where existing data cannot conflict.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_students_user_id'
    ) THEN
        ALTER TABLE students
        ADD CONSTRAINT fk_students_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_students_department_id'
    ) THEN
        ALTER TABLE students
        ADD CONSTRAINT fk_students_department_id
        FOREIGN KEY (department_id)
        REFERENCES departments(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_faculty_user_id'
    ) THEN
        ALTER TABLE faculty
        ADD CONSTRAINT fk_faculty_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_faculty_department_id'
    ) THEN
        ALTER TABLE faculty
        ADD CONSTRAINT fk_faculty_department_id
        FOREIGN KEY (department_id)
        REFERENCES departments(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_enrollments_student_id'
    ) THEN
        ALTER TABLE enrollments
        ADD CONSTRAINT fk_enrollments_student_id
        FOREIGN KEY (student_id)
        REFERENCES students(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_enrollments_subject_id'
    ) THEN
        ALTER TABLE enrollments
        ADD CONSTRAINT fk_enrollments_subject_id
        FOREIGN KEY (subject_id)
        REFERENCES courses(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_faculty_subjects_faculty_id'
    ) THEN
        ALTER TABLE faculty_subjects
        ADD CONSTRAINT fk_faculty_subjects_faculty_id
        FOREIGN KEY (faculty_id)
        REFERENCES faculty(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_faculty_subjects_subject_id'
    ) THEN
        ALTER TABLE faculty_subjects
        ADD CONSTRAINT fk_faculty_subjects_subject_id
        FOREIGN KEY (subject_id)
        REFERENCES courses(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_activity_logs_user_id'
    ) THEN
        ALTER TABLE activity_logs
        ADD CONSTRAINT fk_activity_logs_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id);
    END IF;
END $$;


-- ============================================================
-- 12. ATTENDANCE FOREIGN KEYS
-- Existing records are compatible with students/QR sessions.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_attendance_student_id'
    ) THEN
        ALTER TABLE attendance
        ADD CONSTRAINT fk_attendance_student_id
        FOREIGN KEY (student_id)
        REFERENCES students(id);
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_attendance_qr_session_id'
    ) THEN
        ALTER TABLE attendance
        ADD CONSTRAINT fk_attendance_qr_session_id
        FOREIGN KEY (qr_session_id)
        REFERENCES qr_sessions(id);
    END IF;
END $$;


-- ============================================================
-- 13. QR SESSION FOREIGN KEYS
--
-- IMPORTANT:
-- We deliberately DO NOT add course_id FK yet.
-- courses is empty while existing QR sessions reference course 10.
-- We will populate the real 8 subjects first.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_qr_sessions_faculty_id'
    ) THEN
        ALTER TABLE qr_sessions
        ADD CONSTRAINT fk_qr_sessions_faculty_id
        FOREIGN KEY (faculty_id)
        REFERENCES faculty(id);
    END IF;
END $$;


-- ============================================================
-- 14. ATTENDANCE DUPLICATE PROTECTION
--
-- Add only if there are currently no duplicates.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM attendance
        GROUP BY student_id, qr_session_id
        HAVING COUNT(*) > 1
    ) THEN

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'uq_student_qr_session_attendance'
        ) THEN
            ALTER TABLE attendance
            ADD CONSTRAINT uq_student_qr_session_attendance
            UNIQUE (student_id, qr_session_id);
        END IF;

    END IF;
END $$;


COMMIT;
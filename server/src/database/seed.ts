import { db } from './db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    await db.query('BEGIN');

    console.log('🧹 Cleaning existing data...');
    await db.query(`
      TRUNCATE TABLE 
        users, patients, doctors, caregivers, conditions, 
        care_plans, care_phases, recovery_logs, symptom_logs,
        medications, medication_schedules, medication_logs,
        exercises, exercise_logs, appointments, medical_documents,
        document_chunks, notification_preferences, notifications, 
        patient_documents, risk_alerts, recovery_scores, weekly_reports, 
        chat_sessions, chat_messages
      RESTART IDENTITY CASCADE;
    `);

    console.log('🔑 Generating passwords...');
    const passwordHash = await bcrypt.hash('Password123!', 12);

    console.log('👨‍⚕️ Creating Doctor...');
    const doctorUserId = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_email_verified) 
       VALUES ($1, $2, $3, 'doctor', 'Sarah', 'Connor', true)`,
      [doctorUserId, 'doctor@demo.com', passwordHash]
    );

    const doctorId = uuidv4();
    await db.query(
      `INSERT INTO doctors (id, user_id, license_number, specialty, is_verified) 
       VALUES ($1, $2, 'LIC123456', 'Orthopedics', true)`,
      [doctorId, doctorUserId]
    );

    console.log('🤒 Creating Patient (Samiksha)...');
    const patientUserId = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_email_verified) 
       VALUES ($1, $2, $3, 'patient', 'Samiksha', 'Kaushal', true)`,
      [patientUserId, 'samiksha@gmail.com', passwordHash]
    );

    const patientId = uuidv4();
    await db.query(
      `INSERT INTO patients (id, user_id, date_of_birth, gender) 
       VALUES ($1, $2, '1985-05-15', 'male')`,
      [patientId, patientUserId]
    );

    console.log('🤝 Creating Caregiver...');
    const caregiverUserId = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_email_verified) 
       VALUES ($1, $2, $3, 'caregiver', 'Jane', 'Doe', true)`,
      [caregiverUserId, 'caregiver@demo.com', passwordHash]
    );

    await db.query(
      `INSERT INTO caregivers (id, user_id, patient_id, relationship, is_primary) 
       VALUES ($1, $2, $3, 'Spouse', true)`,
      [uuidv4(), caregiverUserId, patientId]
    );

    console.log('📋 Creating Care Plan...');
    const conditionId = uuidv4();
    await db.query(
      `INSERT INTO conditions (id, patient_id, doctor_id, name, status, severity) 
       VALUES ($1, $2, $3, 'Post-ACL Reconstruction', 'active', 'medium')`,
      [conditionId, patientId, doctorId]
    );

    const carePlanId = uuidv4();
    await db.query(
      `INSERT INTO care_plans (id, patient_id, doctor_id, condition_id, title, status, start_date, duration_weeks) 
       VALUES ($1, $2, $3, $4, 'ACL Recovery Plan', 'active', CURRENT_DATE, 12)`,
      [carePlanId, patientId, doctorId, conditionId]
    );

    console.log('💊 Creating Medications...');
    const medId = uuidv4();
    await db.query(
      `INSERT INTO medications (id, name, generic_name, drug_class) 
       VALUES ($1, 'Ibuprofen', 'Ibuprofen', 'NSAID')`,
      [medId]
    );

    await db.query(
      `INSERT INTO medication_schedules (id, patient_id, care_plan_id, medication_id, doctor_id, dosage, frequency, scheduled_times, start_date) 
       VALUES ($1, $2, $3, $4, $5, '400mg', 'daily', ARRAY['08:00:00', '20:00:00']::TIME[], CURRENT_DATE)`,
      [uuidv4(), patientId, carePlanId, medId, doctorId]
    );

    console.log('🏋️ Creating Exercises...');
    const exerciseId = uuidv4();
    await db.query(
      `INSERT INTO exercises (id, name, category, difficulty) 
       VALUES ($1, 'Heel Slides', 'mobility', 'beginner')`,
      [exerciseId]
    );

    await db.query(
      `INSERT INTO exercise_logs (id, patient_id, care_plan_id, exercise_id, log_date, sets_completed, reps_completed) 
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 3, 10)`,
      [uuidv4(), patientId, carePlanId, exerciseId]
    );
    
    await db.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();

const { db } = require('./src/database/db');

(async () => {
  try {
    const { rows: [doctor] } = await db.query("SELECT * FROM users WHERE role = 'doctor' LIMIT 1");
    const { rows: [patient] } = await db.query("SELECT * FROM patients LIMIT 1");

    const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: doctor.email, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    const prescribeRes = await fetch(
      `http://localhost:5001/api/v1/doctor/patients/${patient.id}/medications`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicationName: 'Test Med',
          dosage: '10mg',
          frequency: 'daily',
          timesPerDay: 1,
        })
      }
    );

    console.log('Status:', prescribeRes.status);
    const result = await prescribeRes.json();
    console.log('Result:', result);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
})();

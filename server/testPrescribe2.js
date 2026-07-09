const http = require('http');
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/recoveryos' });
  await client.connect();

  try {
    const { rows: [doctor] } = await client.query("SELECT * FROM users WHERE role = 'doctor' LIMIT 1");
    const { rows: [patient] } = await client.query("SELECT * FROM patients LIMIT 1");

    if (!doctor || !patient) {
      console.log('Missing data');
      process.exit(1);
    }

    // Login
    const loginData = JSON.stringify({ email: doctor.email, password: 'password123' });
    const loginReq = http.request('http://localhost:5001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const token = JSON.parse(data).data.accessToken;

        // Prescribe
        const prescribeData = JSON.stringify({
          medicationName: 'Test Med',
          dosage: '10mg',
          frequency: 'daily',
          timesPerDay: 1,
        });
        const prescribeReq = http.request(`http://localhost:5001/api/v1/doctor/patients/${patient.id}/medications`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Content-Length': Buffer.byteLength(prescribeData),
            'Authorization': `Bearer ${token}`
          }
        }, (res2) => {
          let data2 = '';
          res2.on('data', chunk => data2 += chunk);
          res2.on('end', () => {
            console.log('Prescribe Status:', res2.statusCode);
            console.log('Prescribe Response:', data2);
            process.exit(0);
          });
        });
        prescribeReq.write(prescribeData);
        prescribeReq.end();
      });
    });
    loginReq.write(loginData);
    loginReq.end();
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();

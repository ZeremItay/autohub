// Quick test script for Zoom API
// Run with: node test-zoom-api.js

const crypto = require('crypto');

// Test credentials (replace with your actual values)
const CLIENT_ID = 'ngNPcJOESPWoRAQxf3jfjQ';
const CLIENT_SECRET = 'IQpTv3KqKguI44mXvt4eRGirm9S0P3a7';
const MEETING_NUMBER = '123456789'; // Replace with a real meeting number

// Generate signature (same logic as in the API route)
const timestamp = new Date().getTime() - 30000;
const msg = Buffer.from(`${CLIENT_ID}${MEETING_NUMBER}${timestamp}`).toString('base64');
const hash = crypto.createHmac('sha256', CLIENT_SECRET).update(msg).digest('base64');
const signature = Buffer.from(`${CLIENT_ID}.${MEETING_NUMBER}.${timestamp}.${hash}`).toString('base64');

console.log('✅ Signature generated successfully!');
console.log('Client ID:', CLIENT_ID);
console.log('Meeting Number:', MEETING_NUMBER);
console.log('Signature:', signature.substring(0, 50) + '...');
console.log('\n📝 Add these to your .env.local file:');
console.log(`ZOOM_CLIENT_ID=${CLIENT_ID}`);
console.log(`ZOOM_CLIENT_SECRET=${CLIENT_SECRET}`);


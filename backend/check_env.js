const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pw = process.env.DB_PASSWORD || '';
console.log('Length:', pw.length);
const chars = [];
for (let i = 0; i < pw.length; i++) {
    chars.push(pw.charCodeAt(i));
}
console.log('Char codes:', chars.join(','));
console.log('Password:', JSON.stringify(pw));
process.exit(0);

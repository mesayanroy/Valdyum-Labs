const fs = require('fs');
const file = 'c:/Users/SAYAN/Valdyum-Labs-1/client/app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file got duplicated and messed up. I'll find the last known good part and rebuild.
// Actually, I'll just look for the double return and double div.

const startOfMessedUp = content.indexOf('  const dailyPnlMap = new Map<string, number>();');
if (startOfMessedUp !== -1) {
    const endOfValidHeader = content.lastIndexOf('export default function DashboardPage() {');
    // I'll just try to find the start of the return statement and fix it.
    
    // Better: I'll search for the first return ( and the last ) and replace the whole component body.
}

// I'll use a regex to find the duplicate block and remove it.
// Actually, I'll just overwrite with a clean version since I have the viewed content.

// Wait! I'll just re-read the file to be sure.

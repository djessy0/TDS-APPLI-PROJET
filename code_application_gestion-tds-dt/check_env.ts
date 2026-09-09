
import fs from 'fs';
import path from 'path';

console.log("DATABASE_PATH:", process.env.DATABASE_PATH);
console.log("DISK_PATH:", process.env.DISK_PATH);
console.log("CWD:", process.cwd());

try {
  if (fs.existsSync("/var/local")) {
    console.log("Contents of /var/local:", fs.readdirSync("/var/local"));
  }
} catch (e: any) {
  console.log("Error listing /var/local:", e.message);
}

try {
  if (process.env.DISK_PATH && fs.existsSync(process.env.DISK_PATH)) {
    console.log(`Contents of ${process.env.DISK_PATH}:`, fs.readdirSync(process.env.DISK_PATH));
  }
} catch (e: any) {
  console.log("Error listing DISK_PATH:", e.message);
}


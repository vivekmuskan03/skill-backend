import fs from 'fs';
import path from 'path';

export function ensureUploadDirs() {
  const dirs = [
    path.join(process.cwd(), 'backend', 'uploads'),
    path.join(process.cwd(), 'backend', 'uploads', 'certificates'),
    path.join(process.cwd(), 'backend', 'uploads', 'submissions')
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}



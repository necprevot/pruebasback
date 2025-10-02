import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');

// Patrones a eliminar
const patterns = [
  /console\.log\([^)]*\);?\s*/g,
  /console\.error\([^)]*\);?\s*/g,
  /console\.warn\([^)]*\);?\s*/g,
  /console\.info\([^)]*\);?\s*/g,
  /console\.debug\([^)]*\);?\s*/g,
];

// Directorios a procesar
const directories = [
  'src',
  'public/js'
];

// Archivos a excluir
const excludeFiles = [
  'logger.js',
  'remove-logs.js'
];

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let hasChanges = false;

  patterns.forEach(pattern => {
    if (pattern.test(newContent)) {
      newContent = newContent.replace(pattern, '');
      hasChanges = true;
    }
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Limpiado: ${filePath}`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalCleaned = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalCleaned += processDirectory(filePath);
    } else if (file.endsWith('.js') && !excludeFiles.includes(file)) {
      if (processFile(filePath)) {
        totalCleaned++;
      }
    }
  });

  return totalCleaned;
}

console.log('🧹 Limpiando console.log del proyecto...\n');

let totalCleaned = 0;
directories.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  if (fs.existsSync(fullPath)) {
    totalCleaned += processDirectory(fullPath);
  }
});

console.log(`\n✨ Proceso completado. ${totalCleaned} archivos limpiados.`);
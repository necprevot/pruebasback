import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function cleanFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remover alert() pero NO showAlert()
  content = content.replace(/(?<!show)(?<!Checkout)alert\s*\([^)]*\)\s*;?/g, '');
  
  // Remover console.log/error/warn
  content = content.replace(/console\.(log|error|warn|info|debug)\s*\([^)]*\)\s*;?/g, '');
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    console.log('✅', filePath);
    return true;
  }
  return false;
}

function processDir(dir) {
  let count = 0;
  readdirSync(dir).forEach(file => {
    const path = join(dir, file);
    const stat = statSync(path);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      count += processDir(path);
    } else if (file.endsWith('.js') || file.endsWith('.handlebars')) {
      if (cleanFile(path)) count++;
    }
  });
  return count;
}

console.log('🧹 Limpiando...\n');
const cleaned = processDir('src') + processDir('public');
console.log(`\n✨ ${cleaned} archivos limpiados`);
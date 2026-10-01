const fs = require('fs');
const path = require('path');

const files = [
  'app/dashboard-paciente/resultados/page.tsx',
  'app/dashboard-paciente/programar-cita/page.tsx',
  'app/dashboard-paciente/page.tsx',
  'app/dashboard-admin/subir-resultados/page.tsx',
  'app/dashboard-admin/reportes/page.tsx',
  'app/dashboard-admin/page.tsx',
  'app/dashboard-admin/pacientes/page.tsx',
  'app/dashboard-admin/gestionar-citas/page.tsx',
  'app/dashboard-admin/agenda/page.tsx',
  'app/components/AgenteIA.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log('Skipping ' + file + ' (does not exist)');
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('fetchAuth')) continue;
  
  let newContent = content.replace(/\bfetch\(/g, 'fetchAuth(');
  
  const depth = file.split('/').length - 2;
  let relativePrefix = '../'.repeat(depth);
  if (depth === 0) relativePrefix = './';
  
  const importStatement = `import { fetchAuth } from "${relativePrefix}utils/fetchAuth";\n`;
  
  const lastImportIndex = newContent.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const endOfLastImport = newContent.indexOf('\n', lastImportIndex);
    newContent = newContent.slice(0, endOfLastImport + 1) + importStatement + newContent.slice(endOfLastImport + 1);
  } else {
    newContent = importStatement + newContent;
  }
  
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Updated ' + file);
}

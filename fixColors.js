const fs = require('fs');

const files = [
  'client/src/pages/auth/RegisterPage.tsx',
  'client/src/pages/caregiver/PatientDetail.tsx',
  'client/src/pages/caregiver/Dashboard.tsx',
  'client/src/pages/caregiver/PatientList.tsx',
  'client/src/pages/doctor/PatientDetail.tsx',
  'client/src/pages/doctor/PatientList.tsx',
  'client/src/pages/doctor/CarePlanBuilder.tsx',
  'client/src/pages/admin/Dashboard.tsx'
];

const replacements = [
  { regex: /text-slate-100/g, replacement: 'text-surface-900' },
  { regex: /text-slate-200/g, replacement: 'text-surface-900' },
  { regex: /text-slate-300/g, replacement: 'text-surface-700' },
  { regex: /text-slate-400/g, replacement: 'text-surface-500' },
  { regex: /text-slate-500/g, replacement: 'text-surface-500' },
  { regex: /text-slate-600/g, replacement: 'text-surface-600' },
  { regex: /bg-slate-800\/50/g, replacement: 'bg-surface-50' },
  { regex: /bg-surface-800\/50/g, replacement: 'bg-surface-50' },
  { regex: /bg-slate-800/g, replacement: 'bg-surface-100' },
  { regex: /bg-surface-800/g, replacement: 'bg-surface-100' },
  { regex: /border-slate-800/g, replacement: 'border-surface-200' },
  { regex: /border-surface-800/g, replacement: 'border-surface-200' },
  { regex: /hover:text-slate-300/g, replacement: 'hover:text-surface-800' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-surface-100' },
  { regex: /hover:bg-white\/5/g, replacement: 'hover:bg-surface-50' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});

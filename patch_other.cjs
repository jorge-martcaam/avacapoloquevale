const fs = require('fs');

let overview = fs.readFileSync('src/Overview.tsx', 'utf8');
overview = overview.replace(/"💼 Nómina \/ Pensión"/g, '"Nómina / Pensión"');
overview = overview.replace(/"📦 Outros"/g, '"Outros"');
overview = overview.replace(/"💼 Nómina"/g, '"Nómina"');
overview = overview.replace(/"💸 Bizum \/ Transf\."/g, '"Bizum / Transf."');
overview = overview.replace(/"🔄 Fixos \/ Recorrentes"/g, '"Fixos / Recorrentes"');
overview = overview.replace(/"🛒 Supermercado"/g, '"Supermercado"');
overview = overview.replace(/"🍻 Ocio e Rest\."/g, '"Ocio e Rest."');
overview = overview.replace(/"🐜 Formiga \/ Outros"/g, '"Formiga / Outros"');
overview = overview.replace(/"📊 Taxa de aforro"/g, '"Taxa de aforro"');
overview = overview.replace(/"⚖️ Obxectivo"/g, '"Obxectivo"');
overview = overview.replace(/"🗓️ Marxe diario"/g, '"Marxe diario"');
fs.writeFileSync('src/Overview.tsx', overview);
console.log('Successfully patched Overview.tsx');

let firestore = fs.readFileSync('src/lib/firestore.ts', 'utf8');
firestore = firestore.replace(/"📦 Outros"/g, '"Outros"');
fs.writeFileSync('src/lib/firestore.ts', firestore);
console.log('Successfully patched firestore.ts');

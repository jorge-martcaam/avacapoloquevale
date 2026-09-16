const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

const oldIsAlimentacion = `        const isAlimentacion = 
          superCat.includes("alimentación") || 
          superCat.includes("alimentacion") ||
          cat.includes("supermercado") ||
          cat.includes("alimentación") ||
          cat.includes("comida") ||
          cat.includes("compra");`;

const newIsAlimentacion = `        const isAlimentacion = 
          superCat.includes("alimentación") || 
          superCat.includes("alimentacion");`;

code = code.replace(oldIsAlimentacion, newIsAlimentacion);

fs.writeFileSync('src/Overview.tsx', code);
console.log('Strict alimentacion patched');

const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

// Replace breakdown definition
code = code.replace(
  'supermercado: { total: 0, txs: [] as Transaction[] },',
  'alimentacion: { total: 0, txs: [] as Transaction[] },'
);

// Replace isSuper logic
const oldIsSuper = `        const cat = (t.category || "").toLowerCase();
        const isSuper =
          cat.includes("supermercado") ||
          cat.includes("alimentación") ||
          cat.includes("comida") ||
          cat.includes("compra");`;
const newIsAlimentacion = `        const cat = (t.category || "").toLowerCase();
        const superCat = (t.superCategory || "").toLowerCase();
        const isAlimentacion = 
          superCat.includes("alimentación") || 
          superCat.includes("alimentacion") ||
          cat.includes("supermercado") ||
          cat.includes("alimentación") ||
          cat.includes("comida") ||
          cat.includes("compra");`;
code = code.replace(oldIsSuper, newIsAlimentacion);

// Replace assignment
code = code.replace(
  `} else if (isSuper) {
          expenseBreakdown.supermercado.total += amount;
          expenseBreakdown.supermercado.txs.push(t);`,
  `} else if (isAlimentacion) {
          expenseBreakdown.alimentacion.total += amount;
          expenseBreakdown.alimentacion.txs.push(t);`
);

// Replace UI usage
code = code.replace(/insights\.expenseBreakdown\?\.supermercado/g, 'insights.expenseBreakdown?.alimentacion');

fs.writeFileSync('src/Overview.tsx', code);
console.log('Alimentacion patched');

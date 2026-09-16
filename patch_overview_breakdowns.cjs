const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

// Replace the breakdowns definition
code = code.replace(
  /const incomeBreakdown = \{ nomina: 0, aluguer: 0, outros: 0 \};\n    const expenseBreakdown = \{\n      recorrentes: 0,\n      supermercado: 0,\n      ocio: 0,\n      formiga: 0,\n      outros: 0,\n    \};/,
  `const incomeBreakdown = { 
      nomina: { total: 0, txs: [] as Transaction[] }, 
      aluguer: { total: 0, txs: [] as Transaction[] }, 
      outros: { total: 0, txs: [] as Transaction[] } 
    };
    const expenseBreakdown = {
      recorrentes: { total: 0, txs: [] as Transaction[] },
      supermercado: { total: 0, txs: [] as Transaction[] },
      ocio: { total: 0, txs: [] as Transaction[] },
      formiga: { total: 0, txs: [] as Transaction[] },
      outros: { total: 0, txs: [] as Transaction[] },
    };`
);

// Replace income aggregations
code = code.replace(
  /        if \(isNomina\) incomeBreakdown\.nomina \+= amount;\n        else if \(isAluguer\) incomeBreakdown\.aluguer \+= amount;\n        else incomeBreakdown\.outros \+= amount;/,
  `        if (isNomina) { incomeBreakdown.nomina.total += amount; incomeBreakdown.nomina.txs.push(t); }
        else if (isAluguer) { incomeBreakdown.aluguer.total += amount; incomeBreakdown.aluguer.txs.push(t); }
        else { incomeBreakdown.outros.total += amount; incomeBreakdown.outros.txs.push(t); }`
);

// Replace expense aggregations
code = code.replace(
  /        if \(isRecurring\) \{\n          expenseBreakdown\.recorrentes \+= amount;\n        \} else if \(isFormiga\) \{\n          expenseBreakdown\.formiga \+= amount;\n        \} else if \(isSuper\) \{\n          expenseBreakdown\.supermercado \+= amount;\n        \} else if \(isOcio\) \{\n          expenseBreakdown\.ocio \+= amount;\n        \} else \{\n          expenseBreakdown\.outros \+= amount;\n        \}/,
  `        if (isRecurring) {
          expenseBreakdown.recorrentes.total += amount;
          expenseBreakdown.recorrentes.txs.push(t);
        } else if (isFormiga) {
          expenseBreakdown.formiga.total += amount;
          expenseBreakdown.formiga.txs.push(t);
        } else if (isSuper) {
          expenseBreakdown.supermercado.total += amount;
          expenseBreakdown.supermercado.txs.push(t);
        } else if (isOcio) {
          expenseBreakdown.ocio.total += amount;
          expenseBreakdown.ocio.txs.push(t);
        } else {
          expenseBreakdown.outros.total += amount;
          expenseBreakdown.outros.txs.push(t);
        }`
);

// We need to also update CashflowDashboard. 
// I'll leave CashflowDashboard for a separate edit.

fs.writeFileSync('src/Overview.tsx', code);
console.log('Breakdowns updated');

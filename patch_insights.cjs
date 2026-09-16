const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

const targetBlock = `    const currentMonthVariable = totalExpenses - currentMonthRecurring;
    const potentialSavings = totalIncome - totalExpenses;

    return {
      cycleStartDateStr,
      totalIncome,
      totalExpenses,
      currentMonthRecurring,
      currentMonthVariable,
      potentialSavings,
      antExpenses,
      antExpensesTotal,
      recurring,
      totalRecurringNextMonth
    };`;

const replacementBlock = `    const currentMonthVariable = totalExpenses - currentMonthRecurring;
    const potentialSavings = totalIncome - totalExpenses;

    // Breakdowns
    const incomeBreakdown = { nomina: 0, bizum: 0, outros: 0 };
    const expenseBreakdown = { recorrentes: 0, supermercado: 0, ocio: 0, formiga: 0, outros: 0 };
    
    const recurringNames = new Set(recurring.map(r => r.name));
    const currentCycleTxs = transactions.filter(t => t.date >= cycleStartDateStr);
    
    currentCycleTxs.forEach(t => {
      const amount = Math.abs(t.amount);
      if (t.amount > 0) {
        const isNomina = t.category === "💼 Nómina / Pensión" || 
                        t.name.toLowerCase().includes("nomina") || 
                        t.name.toLowerCase().includes("nómina");
        const isBizum = t.name.toLowerCase().includes("bizum") || (t.category && t.category.toLowerCase().includes("transferencia"));
        
        if (isNomina) incomeBreakdown.nomina += amount;
        else if (isBizum) incomeBreakdown.bizum += amount;
        else incomeBreakdown.outros += amount;
      } else {
        const nameUpper = t.name.trim().toUpperCase();
        const isRecurring = recurringNames.has(nameUpper);
        const isFormiga = amount < antExpenseThreshold && !isRecurring;
        
        const cat = (t.category || "").toLowerCase();
        const isSuper = cat.includes("supermercado") || cat.includes("alimentación") || cat.includes("comida") || cat.includes("compra");
        const isOcio = cat.includes("ocio") || cat.includes("restaurante") || cat.includes("bar") || cat.includes("cafetería") || cat.includes("cultura");

        if (isRecurring) {
          expenseBreakdown.recorrentes += amount;
        } else if (isFormiga) {
          expenseBreakdown.formiga += amount;
        } else if (isSuper) {
          expenseBreakdown.supermercado += amount;
        } else if (isOcio) {
          expenseBreakdown.ocio += amount;
        } else {
          expenseBreakdown.outros += amount;
        }
      }
    });
    
    const savingsRate = totalIncome > 0 ? (potentialSavings / totalIncome) * 100 : 0;
    
    const today = new Date();
    const cycleStart = new Date(cycleStartDateStr);
    let cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.max(1, Math.ceil((cycleEnd.getTime() - today.getTime()) / msPerDay));
    const dailyMargin = Math.max(0, potentialSavings / daysRemaining);

    const savingsMetrics = {
      rate: savingsRate,
      isHealthy: savingsRate >= 20,
      dailyMargin: dailyMargin
    };

    return {
      cycleStartDateStr,
      totalIncome,
      totalExpenses,
      currentMonthRecurring,
      currentMonthVariable,
      potentialSavings,
      antExpenses,
      antExpensesTotal,
      recurring,
      totalRecurringNextMonth,
      incomeBreakdown,
      expenseBreakdown,
      savingsMetrics
    };`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementBlock);
  fs.writeFileSync('src/Overview.tsx', code);
  console.log('Successfully patched insights');
} else {
  console.error('Target block not found');
}

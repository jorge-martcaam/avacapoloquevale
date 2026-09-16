const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

// 1. Replace the type and initialization of expenseBreakdown
const oldInit = `    const expenseBreakdown = {
      recorrentes: { total: 0, txs: [] as Transaction[] },
      alimentacion: { total: 0, txs: [] as Transaction[] },
      ocio: { total: 0, txs: [] as Transaction[] },
      formiga: { total: 0, txs: [] as Transaction[] },
      outros: { total: 0, txs: [] as Transaction[] },
    };`;
const newInit = `    const expenseBreakdown: Record<string, { total: number; txs: Transaction[] }> = {};`;
code = code.replace(oldInit, newInit);

// 2. Replace the assignment logic
const oldAssign = `        const nameUpper = t.name.trim().toUpperCase();
        const isRecurring = recurringNames.has(nameUpper);
        const isFormiga = amount < antExpenseThreshold && !isRecurring;

        const cat = (t.category || "").toLowerCase();
        const superCat = (t.superCategory || "").toLowerCase();
        const isAlimentacion = 
          superCat.includes("alimentación") || 
          superCat.includes("alimentacion");
        const isOcio =
          cat.includes("ocio") ||
          cat.includes("restaurante") ||
          cat.includes("bar") ||
          cat.includes("cafetería") ||
          cat.includes("cultura");

        if (isRecurring) {
          expenseBreakdown.recorrentes.total += amount;
          expenseBreakdown.recorrentes.txs.push(t);
        } else if (isFormiga) {
          expenseBreakdown.formiga.total += amount;
          expenseBreakdown.formiga.txs.push(t);
        } else if (isAlimentacion) {
          expenseBreakdown.alimentacion.total += amount;
          expenseBreakdown.alimentacion.txs.push(t);
        } else if (isOcio) {
          expenseBreakdown.ocio.total += amount;
          expenseBreakdown.ocio.txs.push(t);
        } else {
          expenseBreakdown.outros.total += amount;
          expenseBreakdown.outros.txs.push(t);
        }`;
const newAssign = `        const superCat = t.superCategory || "Sen clasificar";
        if (!expenseBreakdown[superCat]) {
          expenseBreakdown[superCat] = { total: 0, txs: [] };
        }
        expenseBreakdown[superCat].total += amount;
        expenseBreakdown[superCat].txs.push(t);`;
code = code.replace(oldAssign, newAssign);

// 3. Update the UI rendering of Gastos
const oldUI = `            <div className="w-full flex flex-col gap-2 text-sm text-slate-600">
              <button onClick={() => setSelectedDetail({ title: "🔄 Fixos / Recorrentes", txs: insights.expenseBreakdown?.recorrentes?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🔄 Fixos / Recorrentes</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.recorrentes.total.toFixed(0)} €</span>
              </button>
              <button onClick={() => setSelectedDetail({ title: "🛒 Alimentación", txs: insights.expenseBreakdown?.alimentacion?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🛒 Alimentación</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.alimentacion.total.toFixed(0)} €</span>
              </button>
              <button onClick={() => setSelectedDetail({ title: "🍻 Ocio e Rest.", txs: insights.expenseBreakdown?.ocio?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🍻 Ocio e Rest.</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.ocio.total.toFixed(0)} €</span>
              </button>
              <button onClick={() => setSelectedDetail({ title: "🐜 Formiga / Outros", txs: [...(insights.expenseBreakdown?.formiga?.txs || []), ...(insights.expenseBreakdown?.outros?.txs || [])] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🐜 Formiga / Outros</span>
                <span className="font-bold shrink-0">{((insights.expenseBreakdown?.formiga?.total || 0) + (insights.expenseBreakdown?.outros?.total || 0)).toFixed(0)} €</span>
              </button>
            </div>`;
const newUI = `            <div className="w-full flex flex-col gap-2 text-sm text-slate-600">
              {Object.entries(insights.expenseBreakdown || {})
                .sort((a: any, b: any) => b[1].total - a[1].total)
                .map(([catName, data]: [string, any]) => (
                <button key={catName} onClick={() => setSelectedDetail({ title: catName, txs: data.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                  <span className="truncate pr-2">{catName}</span>
                  <span className="font-bold shrink-0">{data.total.toFixed(0)} €</span>
                </button>
              ))}
            </div>`;
code = code.replace(oldUI, newUI);

fs.writeFileSync('src/Overview.tsx', code);
console.log('Expenses dynamic list patched');

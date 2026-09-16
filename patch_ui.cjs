const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

const targetBlock = `function CashflowDashboard({ insights }: { insights: any }) {
  return (
    <div className="bg-slate-50 p-6 md:p-10 rounded-3xl border border-slate-100 min-h-[50vh]">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">
        Radiografía do Mes Actual
      </h2>
      
      {/* Waterfall Visualizer */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
          
          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl mb-4 border border-emerald-200">
              +
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos</span>
            <span className="text-3xl font-black text-emerald-600">{insights.totalIncome.toFixed(0)} €</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center font-bold text-2xl mb-4 border border-rose-200">
              -
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Gastos</span>
            <span className="text-3xl font-black text-rose-600">{insights.totalExpenses.toFixed(0)} €</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="\`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 border \${insights.potentialSavings >= 0 ? "bg-slate-900 text-white border-slate-900" : "bg-rose-600 text-white border-rose-700"}\`">
              =
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Aforro Total<br/><span className="text-[10px] normal-case font-medium">(Marxe)</span></span>
            <span className="\`text-3xl font-black \${insights.potentialSavings >= 0 ? "text-slate-900" : "text-rose-600"}\`">
              {insights.potentialSavings.toFixed(0)} €
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-900 font-medium">
          A <strong>Radiografía do Mes Actual</strong> móstrache o resumo de ingresos e gastos contabilizados dende a túa última nómina (detectada o {insights.cycleStartDateStr.split('-').reverse().join('/')}). O teu <strong>Aforro Total</strong> é a diferenza directa entre o que entrou e o que saíu neste ciclo.
        </p>
      </div>
    </div>
  );
}`;

const replacementBlock = `function CashflowDashboard({ insights }: { insights: any }) {
  return (
    <div className="bg-slate-50 p-6 md:p-10 rounded-3xl border border-slate-100 min-h-[50vh]">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">
        Radiografía do Mes Actual
      </h2>
      
      {/* Waterfall Visualizer */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative">
          
          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl mb-4 border border-emerald-200">
              +
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos</span>
            <span className="text-3xl font-black text-emerald-600 mb-6">{insights.totalIncome.toFixed(0)} €</span>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">💼 Nómina</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.nomina.toFixed(0)} €</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">💸 Bizum / Transf.</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.bizum.toFixed(0)} €</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">📦 Outros</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.outros.toFixed(0)} €</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center font-bold text-2xl mb-4 border border-rose-200">
              -
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Gastos</span>
            <span className="text-3xl font-black text-rose-600 mb-6">{insights.totalExpenses.toFixed(0)} €</span>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🔄 Fixos / Recorrentes</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.recorrentes.toFixed(0)} €</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🛒 Supermercado</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.supermercado.toFixed(0)} €</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🍻 Ocio e Rest.</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.ocio.toFixed(0)} €</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🐜 Formiga / Outros</span>
                <span className="font-bold shrink-0">{((insights.expenseBreakdown?.formiga || 0) + (insights.expenseBreakdown?.outros || 0)).toFixed(0)} €</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <div className={\`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 border \${insights.potentialSavings >= 0 ? "bg-slate-900 text-white border-slate-900" : "bg-rose-600 text-white border-rose-700"}\`}>
              =
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Aforro Total</span>
            <span className={\`text-3xl font-black mb-6 \${insights.potentialSavings >= 0 ? "text-slate-900" : "text-rose-600"}\`}>
              {insights.potentialSavings.toFixed(0)} €
            </span>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">📊 Taxa de aforro</span>
                <span className="font-bold shrink-0">{insights.savingsMetrics?.rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">⚖️ Obxectivo</span>
                <span className={\`font-bold shrink-0 \${insights.savingsMetrics?.isHealthy ? 'text-emerald-600' : 'text-amber-600'}\`}>
                  {insights.savingsMetrics?.isHealthy ? 'Saudable' : 'Mellorable'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🗓️ Marxe diario</span>
                <span className="font-bold shrink-0">{insights.savingsMetrics?.dailyMargin.toFixed(0)} €/día</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-900 font-medium">
          A <strong>Radiografía do Mes Actual</strong> móstrache o resumo de ingresos e gastos contabilizados dende a túa última nómina (detectada o {insights.cycleStartDateStr.split('-').reverse().join('/')}). O teu <strong>Aforro Total</strong> é a diferenza directa entre o que entrou e o que saíu neste ciclo.
        </p>
      </div>
    </div>
  );
}`;

if (code.includes('function CashflowDashboard({ insights }: { insights: any }) {')) {
  // We will do a simpler replace because of exact formatting issues in template literals
  const regex = /function CashflowDashboard.*?}\);?\s*}/s;
  const replaced = code.replace(regex, replacementBlock);
  fs.writeFileSync('src/Overview.tsx', replaced);
  console.log('Successfully patched UI');
} else {
  console.error('Target function not found');
}

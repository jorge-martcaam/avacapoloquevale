import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, getDismissedAlerts, dismissInsightAlert, normalizeName } from './lib/firestore';
import { Bell, AlertTriangle, Repeat, CalendarClock, Info, TrendingDown, TrendingUp, X, PiggyBank, ArrowUpRight, ArrowDownRight, BarChart2, CheckCircle2, Zap } from 'lucide-react';

export function InsightsManager({ transactions }: { transactions: Transaction[] }) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [recurringThreshold, setRecurringThreshold] = useState<number>(2);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const dbAlerts = await getDismissedAlerts();
      if (mounted && dbAlerts.length > 0) {
        setDismissedAlerts(new Set(dbAlerts));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleDismiss = async (id: string) => {
    // Optimistic update
    setDismissedAlerts(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Persist to firestore
    await dismissInsightAlert(id);
  };

  const insights = useMemo(() => {
    const alerts: React.ReactNode[] = [];
    const recurring: { name: string; amount: number; frequency: string; count: number; totalAmount: number }[] = [];
    
    // Sort transactions by date desc
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // 1. Alert Engine: Unclassified transactions
    const unclassifiedCount = sorted.filter(t => !t.category || t.category === 'Sen clasificar').length;
    if (unclassifiedCount > 0 && !dismissedAlerts.has('unclassified')) {
      alerts.push(
        <div key="unclassified" className="flex items-start gap-4 p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 shadow-sm relative pr-10">
          <button onClick={() => handleDismiss('unclassified')} className="absolute top-3 right-3 text-amber-500 hover:text-amber-800 transition-colors" title="Descartar aviso">
            <X size={20} />
          </button>
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div>
            <h4 className="font-bold">Movementos sen clasificar</h4>
            <p className="text-sm mt-1 text-amber-700">Tes {unclassifiedCount} movementos sen clasificar. Categorízalos para entender mellor os teus gastos e facer mellores previsións.</p>
          </div>
        </div>
      );
    }
    
    // 1b. Alert engine: Duplicate charges
    const duplicates: Transaction[] = [];
    const seen = new Set();
    for (const t of sorted) {
      const key = `${t.date}_${t.amount}_${t.name}`;
      if (seen.has(key)) {
        duplicates.push(t);
      } else {
        seen.add(key);
      }
    }
    if (duplicates.length > 0 && !dismissedAlerts.has('duplicates')) {
      alerts.push(
        <div key="duplicates" className="flex items-start gap-4 p-4 bg-red-50 text-red-900 rounded-xl border border-red-200 shadow-sm relative pr-10">
          <button onClick={() => handleDismiss('duplicates')} className="absolute top-3 right-3 text-red-400 hover:text-red-800 transition-colors" title="Descartar aviso">
            <X size={20} />
          </button>
          <AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
          <div className="w-full">
            <h4 className="font-bold">Posibles cargos duplicados</h4>
            <p className="text-sm mt-1 text-red-700 mb-3">Detectáronse {duplicates.length} cargos no mesmo día co mesmo importe e concepto. Revisa os teus movementos para descartar erros.</p>
            <div className="space-y-2 mb-2">
              {duplicates.slice(0, 5).map((dup, i) => (
                <div key={i} className="text-xs bg-red-100/50 p-2 rounded border border-red-100 flex justify-between items-center">
                  <span className="font-medium truncate mr-2" title={dup.name}>{dup.name}</span>
                  <div className="flex gap-3 shrink-0">
                    <span className="text-red-600/80">{dup.date}</span>
                    <span className="font-bold">{dup.amount.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
              {duplicates.length > 5 && (
                <div className="text-xs text-red-600 font-medium italic mt-2">
                  ...e {duplicates.length - 5} máis.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 2. Unusually high expenses
    const allExpenses = sorted.filter(t => t.amount < 0);
    if (allExpenses.length > 5) {
      const allExpensesAmounts = allExpenses.map(t => Math.abs(t.amount));
      const avgExpense = allExpensesAmounts.reduce((a, b) => a + b, 0) / allExpensesAmounts.length;
      const variance = allExpensesAmounts.reduce((a, b) => a + Math.pow(b - avgExpense, 2), 0) / allExpensesAmounts.length;
      const stdDev = Math.sqrt(variance);
      
      const threshold = avgExpense + 2.5 * stdDev; // 2.5 sigma
      // Limit to expenses in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentBigTxs = allExpenses.filter(t => Math.abs(t.amount) > threshold && Math.abs(t.amount) > 100 && new Date(t.date) > thirtyDaysAgo);
      
      recentBigTxs.forEach(t => {
        const alertId = `high_expense_${t.id}`;
        if (!dismissedAlerts.has(alertId) && t.category !== 'Transferencias' && t.category !== 'Aforro') {
          alerts.push(
            <div key={alertId} className="flex items-start gap-4 p-4 bg-purple-50 text-purple-900 rounded-xl border border-purple-200 shadow-sm relative pr-10">
              <button onClick={() => handleDismiss(alertId)} className="absolute top-3 right-3 text-purple-400 hover:text-purple-800 transition-colors" title="Descartar aviso">
                <X size={20} />
              </button>
              <Zap className="text-purple-500 shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bold">Gasto inusualmente alto</h4>
                <p className="text-sm mt-1 text-purple-700">O movemento <strong>{t.name || t.category}</strong> do {t.date} por valor de {Math.abs(t.amount).toFixed(2)} € é excepcionalmente alto comparado coa túa media habitual. Queres revisalo?</p>
              </div>
            </div>
          );
        }
      });
    }

    // 3. Recurring Expenses & Estimations & Price Increases
    const byName: Record<string, Transaction[]> = {};
    sorted.forEach(t => {
      // Only consider expenses
      if (t.amount < 0 && t.name && t.category !== 'Transferencias' && t.category !== 'Aforro') {
        const n = normalizeName(t.name).toUpperCase() || t.name.trim(); // Group by normalized name
        if (!byName[n]) byName[n] = [];
        byName[n].push(t);
      }
    });

    let totalRecurringNextMonth = 0;

    for (const [key, txs] of Object.entries(byName)) {
      if (txs.length >= recurringThreshold) {
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Find if they span different months
        const months = new Set(txs.map(t => t.date.substring(0, 7)));
        if (months.size > 1 && months.size >= txs.length * 0.5) {
          const totalAmount = txs.reduce((sum, t) => sum + t.amount, 0);
          const avgAmount = totalAmount / txs.length;
          
          // Estimate next expected date
          const lastDate = new Date(txs[0].date);
          const nextExpectedDateObj = new Date(lastDate);
          nextExpectedDateObj.setMonth(nextExpectedDateObj.getMonth() + 1);
          const nextExpectedDate = nextExpectedDateObj.toISOString().split('T')[0];

          recurring.push({
            name: key,
            amount: avgAmount,
            frequency: 'Mensual',
            count: txs.length,
            totalAmount: Math.abs(totalAmount),
            nextExpectedDate
          });
          totalRecurringNextMonth += Math.abs(avgAmount);

          // Alert for recurring price increase
          const currentAmount = Math.abs(txs[0].amount);
          const previousTxs = txs.slice(1);
          const prevTotal = previousTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const prevAvg = prevTotal / previousTxs.length;

          // If current is 15% higher and at least 2 euros more
          if (currentAmount > prevAvg * 1.15 && currentAmount > prevAvg + 2) {
            const alertId = `increase_${key}_${txs[0].id}`;
            if (!dismissedAlerts.has(alertId)) {
              alerts.push(
                <div key={alertId} className="flex items-start gap-4 p-4 bg-orange-50 text-orange-900 rounded-xl border border-orange-200 shadow-sm relative pr-10">
                  <button onClick={() => handleDismiss(alertId)} className="absolute top-3 right-3 text-orange-400 hover:text-orange-800 transition-colors" title="Descartar aviso">
                    <X size={20} />
                  </button>
                  <TrendingUp className="text-orange-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h4 className="font-bold">Subida de recibo detectada</h4>
                    <p className="text-sm mt-1 text-orange-700">Detectouse unha subida no recibo <strong>{key}</strong>. O último cargo de {currentAmount.toFixed(2)} € é superior á túa media habitual de {prevAvg.toFixed(2)} €.</p>
                  </div>
                </div>
              );
            }
          }
        }
      }
    }

    // Sort recurring by count desc
    recurring.sort((a, b) => b.count - a.count);

    // 4. Monthly Statistics (Comparativa & Savings)
    const txsByMonth: Record<string, { month: string, income: number; expense: number; count: number; savings: number }> = {};
    sorted.forEach(t => {
       const month = t.date.substring(0, 7);
       if (!txsByMonth[month]) {
          txsByMonth[month] = { month, income: 0, expense: 0, count: 0, savings: 0 };
       }
       if (t.category !== 'Transferencias') {
         if (t.amount > 0) txsByMonth[month].income += t.amount;
         else txsByMonth[month].expense += Math.abs(t.amount);
         txsByMonth[month].count++;
       }
    });

    for (const key of Object.keys(txsByMonth)) {
      txsByMonth[key].savings = txsByMonth[key].income - txsByMonth[key].expense;
    }

    const monthsDesc = Object.keys(txsByMonth).sort((a,b) => b.localeCompare(a));
    const monthlyStats = monthsDesc.map(m => txsByMonth[m]).slice(0, 6);

    // 5. Supercategory analysis (Current Month vs Previous Month)
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthPrefix = prevDate.toISOString().substring(0, 7);

    const superCatStats: Record<string, { current: number, previous: number }> = {};
    
    sorted.forEach(t => {
       if (t.amount < 0 && t.category !== 'Transferencias' && t.category !== 'Aforro') {
           const sc = t.superCategory || t.category || 'Sen clasificar';
           if (!superCatStats[sc]) superCatStats[sc] = { current: 0, previous: 0 };
           
           const month = t.date.substring(0, 7);
           if (month === currentMonthPrefix) {
               superCatStats[sc].current += Math.abs(t.amount);
           } else if (month === prevMonthPrefix) {
               superCatStats[sc].previous += Math.abs(t.amount);
           }
       }
    });

    const topSuperCategories = Object.entries(superCatStats)
      .filter(([_, stats]) => stats.current > 0 || stats.previous > 0)
      .map(([name, stats]) => {
          const change = stats.previous === 0 ? null : ((stats.current - stats.previous) / stats.previous) * 100;
          return { name, current: stats.current, previous: stats.previous, change };
      })
      .sort((a, b) => b.current - a.current);

    return { alerts, recurring, totalRecurringNextMonth, monthlyStats, topSuperCategories };
  }, [transactions, dismissedAlerts, recurringThreshold]);

  return (
    <div className="bg-slate-50/50 p-6 md:p-8 rounded-3xl border border-slate-100 min-h-[50vh]">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 pb-4 border-b border-slate-200 gap-4 xl:gap-0">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mr-2 flex items-center gap-3">
          <Bell className="text-blue-600" /> Asistente e Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Alerts & Estimates & Savings */}
        <div className="space-y-8">
          <section>
            <h3 className="text-lg flex items-center gap-2 font-bold text-slate-800 mb-4">
              <AlertTriangle className="text-slate-400" size={20} /> Alertas e Avisos
            </h3>
            {insights.alerts.length > 0 ? (
              <div className="space-y-4">
                {insights.alerts}
              </div>
            ) : (
              <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500 text-sm flex items-center gap-3">
                <CheckCircle2 size={24} className="text-green-500" /> Non tes ningunha alerta neste momento. Todo correcto!
              </div>
            )}
          </section>

          <section>
            <h3 className="text-lg flex items-center gap-2 font-bold text-slate-800 mb-4">
              <CalendarClock className="text-slate-400" size={20} /> Promedio de Gastos Fixos
            </h3>
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm">
              <p className="text-sm text-blue-800 mb-2 font-medium">Os teus gastos recorrentes estimados (suscricións, recibos, etc.) suman un total mensual de:</p>
              <div className="text-4xl font-black text-blue-900 tracking-tight">
                {insights.totalRecurringNextMonth.toFixed(2)} €
              </div>
              <p className="text-xs text-blue-600/70 mt-3 font-medium flex items-center gap-1">
                <Info size={14} /> Calculado baseándose na túa media de gastos detectados como recorrentes.
              </p>
            </div>
          </section>

        </div>

        {/* Right Column: Recurring */}
        <div>
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg flex items-center gap-2 font-bold text-slate-800">
                <Repeat className="text-slate-400" size={20} /> Gastos Recorrentes Identificados
              </h3>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <label htmlFor="recurringThreshold" className="text-sm font-medium text-slate-600 truncate">
                  Min. repeticións:
                </label>
                <input
                  type="number"
                  id="recurringThreshold"
                  min="2"
                  max="50"
                  value={recurringThreshold}
                  onChange={(e) => setRecurringThreshold(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-16 p-1 text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            {insights.recurring.length > 0 ? (
              <div className="space-y-3 max-h-[85vh] overflow-y-auto pr-2 pb-8">
                {insights.recurring.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 truncate mr-4">
                      <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100 text-blue-500">
                        <Repeat size={18} />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate" title={rec.name}>{rec.name}</div>
                        <div className="text-xs font-medium text-slate-500 mt-1">
                          Próximo estimado: <span className="font-semibold text-slate-700">{rec.nextExpectedDate || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900">
                        {Math.abs(rec.amount).toFixed(2)} €<span className="text-xs font-normal text-slate-500 ml-1">/mes</span>
                      </div>
                      <div className="text-xs font-medium text-slate-400 mt-1">
                        Detectado {rec.count} veces
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-500 text-sm flex items-center gap-3">
                 <Info size={20} className="text-slate-400" /> Non se detectaron gastos recorrentes aínda. É posible que non teñas suficientes datos no teu historial.
               </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

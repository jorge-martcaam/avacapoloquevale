import React, { useState, useMemo } from "react";
import { Transaction } from "./lib/firestore";
import { TrendingDown, Scissors, Repeat, Wallet, Info } from "lucide-react";

export function Overview({ transactions }: { transactions: Transaction[] }) {
  const [view, setView] = useState<"dashboard" | "savings">("dashboard");
  const [recurringThreshold, setRecurringThreshold] = useState<number>(2);
  const [subscriptionMonthsBack, setSubscriptionMonthsBack] = useState<number>(6);
  const [antExpenseMonthsBack, setAntExpenseMonthsBack] = useState<number>(1);
  const [antExpenseThreshold, setAntExpenseThreshold] = useState<number>(10);

  const insights = useMemo(() => {
    const currentMonthDate = new Date();
    const currentMonthKey = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, "0")}`;
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Ant-expenses (Gasto formiga) - items under 10 euros that aren't recurring and span current month
    let antExpenses: { name: string; amount: number; date: string }[] = [];
    let antExpensesTotal = 0;

    const antLimitDate = new Date();
    if (antExpenseMonthsBack > 0) {
      antLimitDate.setMonth(antLimitDate.getMonth() - antExpenseMonthsBack);
    }
    const antLimitDateStr = antLimitDate.toISOString().substring(0, 10);

    transactions.forEach(t => {
      if (t.date.startsWith(currentMonthKey)) {
        if (t.amount > 0) totalIncome += t.amount;
        else totalExpenses += Math.abs(t.amount);
      }
      
      const isWithinAntTimeframe = antExpenseMonthsBack === 0 || t.date >= antLimitDateStr;
      
      if (t.amount < 0 && isWithinAntTimeframe) {
        if (Math.abs(t.amount) < antExpenseThreshold && Math.abs(t.amount) > 0) {
          antExpenses.push({ name: t.name, amount: Math.abs(t.amount), date: t.date });
          antExpensesTotal += Math.abs(t.amount);
        }
      }
    });

    // Subscriptions / Recurring
    const byName: Record<string, Transaction[]> = {};
    
    const limitDate = new Date();
    if (subscriptionMonthsBack > 0) {
      limitDate.setMonth(limitDate.getMonth() - subscriptionMonthsBack);
    }
    const limitDateStr = limitDate.toISOString().substring(0, 10);

    transactions.forEach(t => {
      if (subscriptionMonthsBack > 0 && t.date < limitDateStr) return;
      if (t.amount < 0) {
        const n = t.name.trim().toUpperCase();
        if (!byName[n]) byName[n] = [];
        byName[n].push(t);
      }
    });

    const recurring: { name: string; avgAmount: number; count: number }[] = [];
    let totalRecurringNextMonth = 0;
    let currentMonthRecurring = 0;

    for (const [key, txs] of Object.entries(byName)) {
      if (txs.length >= recurringThreshold) {
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const months = new Set(txs.map(t => t.date.substring(0, 7)));
        
        if (months.size > 1 && months.size >= txs.length * 0.5) {
          const totalAmount = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const avgAmount = totalAmount / txs.length;
          
          recurring.push({ name: key, avgAmount, count: txs.length });
          totalRecurringNextMonth += avgAmount;

          // Add to current month recurring if we paid it this month
          txs.forEach(t => {
            if (t.date.startsWith(currentMonthKey)) {
              currentMonthRecurring += Math.abs(t.amount);
            }
          });
        }
      }
    }

    const currentMonthVariable = totalExpenses - currentMonthRecurring;
    const potentialSavings = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      currentMonthRecurring,
      currentMonthVariable,
      potentialSavings,
      antExpenses,
      antExpensesTotal,
      recurring,
      totalRecurringNextMonth
    };
  }, [transactions, recurringThreshold, subscriptionMonthsBack, antExpenseMonthsBack, antExpenseThreshold]);

  return (
    <div className="space-y-6 pt-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
          <button
            onClick={() => setView("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${view === "dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <div className="flex items-center gap-2">
              <Wallet size={16} /> Fluxo de Caixa
            </div>
          </button>
          <button
            onClick={() => setView("savings")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${view === "savings" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <div className="flex items-center gap-2">
              <Scissors size={16} /> Oportunidades
            </div>
          </button>
        </div>
        
        {view === "savings" && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <label htmlFor="recurringThreshold" className="text-sm font-medium text-slate-600">
              Min. repeticións recorrentes:
            </label>
            <input
              type="number"
              id="recurringThreshold"
              min="2"
              max="50"
              value={recurringThreshold}
              onChange={(e) => setRecurringThreshold(Math.max(2, parseInt(e.target.value) || 2))}
              className="w-16 p-1 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {view === "dashboard" ? (
        <CashflowDashboard insights={insights} />
      ) : (
        <SavingsOpportunities
          insights={insights}
          subscriptionMonthsBack={subscriptionMonthsBack}
          setSubscriptionMonthsBack={setSubscriptionMonthsBack}
          antExpenseMonthsBack={antExpenseMonthsBack}
          setAntExpenseMonthsBack={setAntExpenseMonthsBack}
          antExpenseThreshold={antExpenseThreshold}
          setAntExpenseThreshold={setAntExpenseThreshold}
        />
      )}
    </div>
  );
}

function CashflowDashboard({ insights }: { insights: any }) {
  return (
    <div className="bg-slate-50 p-6 md:p-10 rounded-3xl border border-slate-100 min-h-[50vh]">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">
        Radiografía do Mes Actual
      </h2>
      
      {/* Waterfall Visualizer */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0 relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
          
          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl mb-4 border border-emerald-200">
              +
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos</span>
            <span className="text-3xl font-black text-emerald-600">{insights.totalIncome.toFixed(0)} €</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-2xl mb-4 border border-slate-200">
              -
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Gastos Fixos<br/><span className="text-[10px] normal-case font-medium">(Recorrentes)</span></span>
            <span className="text-3xl font-black text-slate-700">{insights.currentMonthRecurring.toFixed(0)} €</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center font-bold text-2xl mb-4 border border-rose-200">
              -
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Gastos Variables<br/><span className="text-[10px] normal-case font-medium">(Día a día)</span></span>
            <span className="text-3xl font-black text-rose-600">{insights.currentMonthVariable.toFixed(0)} €</span>
          </div>

          <div className="flex flex-col items-center p-4 bg-white z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 border ${insights.potentialSavings >= 0 ? "bg-slate-900 text-white border-slate-900" : "bg-rose-600 text-white border-rose-700"}`}>
              =
            </div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Aforro Potencial<br/><span className="text-[10px] normal-case font-medium">(Marxe)</span></span>
            <span className={`text-3xl font-black ${insights.potentialSavings >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              {insights.potentialSavings.toFixed(0)} €
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-900 font-medium">
          O <strong>Fluxo de Caixa (Cashflow)</strong> separa os teus gastos en dúas partes: aquilo que non podes evitar facilmente (Gastos Fixos / Recorrentes) e as túas decisións do día a día (Gastos Variables). Reducir os variables é a forma máis rápida de aumentar o teu marxe, mentres que reducir os fixos mellora a túa saúde financeira a longo prazo.
        </p>
      </div>
    </div>
  );
}

function SavingsOpportunities({
  insights,
  subscriptionMonthsBack,
  setSubscriptionMonthsBack,
  antExpenseMonthsBack,
  setAntExpenseMonthsBack,
  antExpenseThreshold,
  setAntExpenseThreshold,
}: {
  insights: any;
  subscriptionMonthsBack: number;
  setSubscriptionMonthsBack: (val: number) => void;
  antExpenseMonthsBack: number;
  setAntExpenseMonthsBack: (val: number) => void;
  antExpenseThreshold: number;
  setAntExpenseThreshold: (val: number) => void;
}) {
  return (
    <div className="bg-slate-50 p-6 md:p-10 rounded-3xl border border-slate-100 min-h-[50vh]">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8 flex items-center gap-3">
        Oportunidades de Aforro
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Micro-expenses (Gasto formiga) */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                  O Gasto Formiga
                </h3>
                <p className="text-sm text-slate-500 font-medium mb-3">Micropagos soltos ({"<"} {antExpenseThreshold}€).</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100 flex-wrap">
                    {[1, 2, 3, 6, 12, 0].map((months) => (
                      <button
                        key={months}
                        onClick={() => setAntExpenseMonthsBack(months)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                          antExpenseMonthsBack === months
                            ? "bg-white text-orange-700 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {months === 0 ? "Todos" : `${months}M`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
                    <label htmlFor="antExpenseThreshold" className="text-xs font-medium text-slate-600">
                      Límite (€):
                    </label>
                    <input
                      type="number"
                      id="antExpenseThreshold"
                      min="1"
                      max="50"
                      value={antExpenseThreshold}
                      onChange={(e) => setAntExpenseThreshold(Math.max(1, parseInt(e.target.value) || 10))}
                      className="w-12 p-1 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <TrendingDown size={24} />
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-black text-slate-900">{insights.antExpensesTotal.toFixed(2)} €</span>
              <p className="text-sm font-bold text-orange-600 mt-1 uppercase tracking-wider">Acumulado este mes</p>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {insights.antExpenses.length > 0 ? (
                insights.antExpenses.map((tx: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="truncate pr-4 font-medium text-sm text-slate-700">{tx.name}</div>
                    <div className="font-bold text-slate-900 shrink-0">{tx.amount.toFixed(2)} €</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic p-4 text-center">Non tes gastos formiga este mes!</div>
              )}
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="flex flex-col space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                  Auditoría de Subscricións
                </h3>
                <p className="text-sm text-slate-500 font-medium mb-3">Custo medio de servizos recorrentes.</p>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl w-fit border border-slate-100 flex-wrap">
                  {[1, 2, 3, 6, 12, 0].map((months) => (
                    <button
                      key={months}
                      onClick={() => setSubscriptionMonthsBack(months)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        subscriptionMonthsBack === months
                          ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {months === 0 ? "Todos" : `${months}M`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Repeat size={24} />
              </div>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-black text-slate-900">{insights.totalRecurringNextMonth.toFixed(2)} €</span>
              <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">Por mes estimado</p>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {insights.recurring.length > 0 ? (
                insights.recurring.map((rec: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-slate-300 transition-colors">
                    <div className="min-w-0 pr-4">
                      <div className="font-bold text-sm text-slate-900 truncate">{rec.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{rec.count} pagos detectados</div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="font-black text-slate-900 text-right">
                        {rec.avgAmount.toFixed(2)} €<span className="text-xs text-slate-400 font-medium block">/mes</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic p-4 text-center">Non se detectaron subscricións recorrentes.</div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

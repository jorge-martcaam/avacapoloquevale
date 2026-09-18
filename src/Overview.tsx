import React, { useState, useMemo } from "react";
import { Transaction } from "./lib/firestore";
import { TrendingDown, Scissors, Repeat, Wallet, Info, X, Calendar } from "lucide-react";
import { CashflowHeatmap } from "./CashflowHeatmap";

export interface PayrollCycle {
  id: string;
  startDateStr: string;
  endDateStr: string | null;
  label: string;
  monthName: string;
  year: number;
  month: number;
  isCurrent: boolean;
  dateRangeText: string;
}

export function Overview({
  transactions,
  userPaydayStart,
  userPaydayEnd,
}: {
  transactions: Transaction[];
  userPaydayStart?: number | null;
  userPaydayEnd?: number | null;
}) {
  const [view, setView] = useState<"dashboard" | "savings">("dashboard");
  const [recurringThreshold, setRecurringThreshold] = useState<number>(2);
  const [subscriptionMonthsBack, setSubscriptionMonthsBack] =
    useState<number>(6);
  const [antExpenseMonthsBack, setAntExpenseMonthsBack] = useState<number>(1);
  const [antExpenseThreshold, setAntExpenseThreshold] = useState<number>(10);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");

  const availableCycles = useMemo<PayrollCycle[]>(() => {
    const sortedByDate = [...transactions].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const startWindow = userPaydayStart || 24;
    const endWindow = userPaydayEnd || 31;

    const salaryDates: string[] = [];

    for (const t of sortedByDate) {
      const day = parseInt(t.date.substring(8, 10), 10);
      const isNomina =
        t.category === "Nómina / Pensión" ||
        t.name.toLowerCase().includes("nomina") ||
        t.name.toLowerCase().includes("nómina");

      let inWindow = false;
      if (startWindow <= endWindow) {
        inWindow = day >= startWindow && day <= endWindow;
      } else {
        inWindow = day >= startWindow || day <= endWindow;
      }

      const isLikelySalary = t.amount > 600 && inWindow;

      if (t.amount > 0 && (isNomina || isLikelySalary)) {
        const isClose = salaryDates.some((d) => {
          const diffDays = Math.abs(
            (new Date(d).getTime() - new Date(t.date).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return diffDays < 15;
        });
        if (!isClose) {
          salaryDates.push(t.date);
        }
      }
    }

    // Also include any months present in transactions that might not have a detected salary
    const monthsInTransactions = Array.from(
      new Set(transactions.map((t) => t.date.substring(0, 7))),
    );
    const fallbackDay = userPaydayStart || 24;
    for (const ym of monthsInTransactions) {
      const parts = ym.split("-").map(Number);
      const y = parts[0];
      const m = parts[1];
      const fallbackStr = `${y}-${String(m).padStart(2, "0")}-${String(Math.min(28, fallbackDay)).padStart(2, "0")}`;
      const isClose = salaryDates.some((d) => {
        const diffDays = Math.abs(
          (new Date(d).getTime() - new Date(fallbackStr).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return diffDays < 20;
      });
      if (!isClose) {
        salaryDates.push(fallbackStr);
      }
    }

    if (salaryDates.length === 0) {
      const today = new Date();
      const fallbackSalaryDay = userPaydayStart || 28;
      let fallbackDate: Date;
      if (today.getDate() >= fallbackSalaryDay) {
        fallbackDate = new Date(today.getFullYear(), today.getMonth(), fallbackSalaryDay);
      } else {
        fallbackDate = new Date(today.getFullYear(), today.getMonth() - 1, fallbackSalaryDay);
      }
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      salaryDates.push(formatDate(fallbackDate));
    }

    salaryDates.sort((a, b) => b.localeCompare(a));

    const monthNames = [
      "Xaneiro", "Febreiro", "Marzo", "Abril", "Maio", "Xuño",
      "Xullo", "Agosto", "Setembro", "Outubro", "Novembro", "Decembro"
    ];

    return salaryDates.map((startDateStr, index) => {
      const isCurrent = index === 0;
      let endDateStr: string | null = null;
      if (!isCurrent) {
        const nextCycleStart = new Date(salaryDates[index - 1]);
        nextCycleStart.setDate(nextCycleStart.getDate() - 1);
        endDateStr = `${nextCycleStart.getFullYear()}-${String(nextCycleStart.getMonth() + 1).padStart(2, "0")}-${String(nextCycleStart.getDate()).padStart(2, "0")}`;
      }

      const d = new Date(startDateStr);
      let cycleYear = d.getFullYear();
      let cycleMonth = d.getMonth() + 1;
      if (d.getDate() >= 20) {
        cycleMonth += 1;
        if (cycleMonth > 12) {
          cycleMonth = 1;
          cycleYear += 1;
        }
      }

      const monthName = monthNames[cycleMonth - 1] || "Mes";
      const startFormatted = startDateStr.split("-").reverse().join("/");
      let dateRangeText = "";
      if (isCurrent) {
        dateRangeText = `dende o ${startFormatted}`;
      } else if (endDateStr) {
        const endFormatted = endDateStr.split("-").reverse().join("/");
        dateRangeText = `${startFormatted} ata o ${endFormatted}`;
      } else {
        dateRangeText = `dende o ${startFormatted}`;
      }

      return {
        id: startDateStr,
        startDateStr,
        endDateStr,
        label: isCurrent ? `Mes actual (${monthName} ${cycleYear})` : `${monthName} ${cycleYear}`,
        monthName,
        year: cycleYear,
        month: cycleMonth,
        isCurrent,
        dateRangeText,
      };
    });
  }, [transactions, userPaydayStart, userPaydayEnd]);

  const activeCycle = useMemo<PayrollCycle>(() => {
    if (!availableCycles.length) {
      return {
        id: "fallback",
        startDateStr: new Date().toISOString().substring(0, 10),
        endDateStr: null,
        label: "Mes actual",
        monthName: "Mes",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        isCurrent: true,
        dateRangeText: "dende hoxe",
      };
    }
    return (
      availableCycles.find((c) => c.id === selectedCycleId) || availableCycles[0]
    );
  }, [availableCycles, selectedCycleId]);

  const insights = useMemo(() => {
    const cycleStartDateStr = activeCycle.startDateStr;
    const cycleEndDateStr = activeCycle.endDateStr;

    const currentCycleTxs = transactions.filter((t) => {
      if (t.date < cycleStartDateStr) return false;
      if (cycleEndDateStr && t.date > cycleEndDateStr) return false;
      return true;
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    currentCycleTxs.forEach((t) => {
      if (t.amount > 0) totalIncome += t.amount;
      else totalExpenses += Math.abs(t.amount);
    });

    // Ant-expenses (Gasto formiga) - items under 10 euros that aren't recurring and span current month
    let antExpenses: { name: string; amount: number; date: string }[] = [];
    let antExpensesTotal = 0;

    const antLimitDate = new Date();
    if (antExpenseMonthsBack > 0) {
      antLimitDate.setMonth(antLimitDate.getMonth() - antExpenseMonthsBack);
    }
    const antLimitDateStr = antLimitDate.toISOString().substring(0, 10);

    transactions.forEach((t) => {
      const isWithinAntTimeframe =
        antExpenseMonthsBack === 0 || t.date >= antLimitDateStr;

      if (t.amount < 0 && isWithinAntTimeframe) {
        if (
          Math.abs(t.amount) < antExpenseThreshold &&
          Math.abs(t.amount) > 0
        ) {
          antExpenses.push({
            name: t.name,
            amount: Math.abs(t.amount),
            date: t.date,
          });
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

    transactions.forEach((t) => {
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
        txs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const months = new Set(txs.map((t) => t.date.substring(0, 7)));

        if (months.size > 1 && months.size >= txs.length * 0.5) {
          const totalAmount = txs.reduce(
            (sum, t) => sum + Math.abs(t.amount),
            0,
          );
          const avgAmount = totalAmount / txs.length;

          recurring.push({ name: key, avgAmount, count: txs.length });
          totalRecurringNextMonth += avgAmount;

          // Add to current month recurring if we paid it in this cycle
          txs.forEach((t) => {
            const inCycle =
              t.date >= cycleStartDateStr &&
              (!cycleEndDateStr || t.date <= cycleEndDateStr);
            if (inCycle) {
              currentMonthRecurring += Math.abs(t.amount);
            }
          });
        }
      }
    }

    const currentMonthVariable = totalExpenses - currentMonthRecurring;
    const potentialSavings = totalIncome - totalExpenses;

    // Breakdowns
    const incomeBreakdown = { 
      nomina: { total: 0, txs: [] as Transaction[] }, 
      aluguer: { total: 0, txs: [] as Transaction[] }, 
      outros: { total: 0, txs: [] as Transaction[] } 
    };
    const expenseBreakdown: Record<string, { total: number; txs: Transaction[] }> = {};

    currentCycleTxs.forEach((t) => {
      const amount = Math.abs(t.amount);
      if (t.amount > 0) {
        const isNomina =
          t.category === "Nómina / Pensión" ||
          t.name.toLowerCase().includes("nomina") ||
          t.name.toLowerCase().includes("nómina") ||
          t.name.toLowerCase().includes("pensión");
        const isAluguer =
          t.category === "Aluguer / Hipoteca" ||
          t.name.toLowerCase().includes("aluguer") ||
          t.name.toLowerCase().includes("alquiler") ||
          t.name.toLowerCase().includes("hipoteca");

        if (isNomina) { incomeBreakdown.nomina.total += amount; incomeBreakdown.nomina.txs.push(t); }
        else if (isAluguer) { incomeBreakdown.aluguer.total += amount; incomeBreakdown.aluguer.txs.push(t); }
        else { incomeBreakdown.outros.total += amount; incomeBreakdown.outros.txs.push(t); }
      } else {
        const superCat = t.superCategory || "Sen clasificar";
        if (!expenseBreakdown[superCat]) {
          expenseBreakdown[superCat] = { total: 0, txs: [] };
        }
        expenseBreakdown[superCat].total += amount;
        expenseBreakdown[superCat].txs.push(t);
      }
    });

    const savingsInvestmentsAmount = expenseBreakdown["Aforro e Investimento"]?.total || 0;
    const adjustedPotentialSavings = totalIncome - (totalExpenses - savingsInvestmentsAmount);

    const savingsRate =
      totalIncome > 0 ? (potentialSavings / totalIncome) * 100 : 0;
    const adjustedSavingsRate =
      totalIncome > 0 ? (adjustedPotentialSavings / totalIncome) * 100 : 0;

    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    let dailyMargin = 0;
    let adjustedDailyMargin = 0;

    if (activeCycle.isCurrent) {
      const cycleStart = new Date(cycleStartDateStr);
      let cycleEnd = new Date(cycleStart);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);
      const daysRemaining = Math.max(
        1,
        Math.ceil((cycleEnd.getTime() - today.getTime()) / msPerDay),
      );
      dailyMargin = Math.max(0, potentialSavings / daysRemaining);
      adjustedDailyMargin = Math.max(0, adjustedPotentialSavings / daysRemaining);
    } else {
      const cycleStart = new Date(cycleStartDateStr);
      const cycleEnd = cycleEndDateStr
        ? new Date(cycleEndDateStr)
        : new Date(cycleStart);
      const totalCycleDays = Math.max(
        1,
        Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay),
      );
      dailyMargin = Math.max(0, potentialSavings / totalCycleDays);
      adjustedDailyMargin = Math.max(0, adjustedPotentialSavings / totalCycleDays);
    }

    const savingsMetrics = {
      rate: savingsRate,
      isHealthy: savingsRate >= 20,
      dailyMargin: dailyMargin,
    };

    const adjustedSavingsMetrics = {
      rate: adjustedSavingsRate,
      isHealthy: adjustedSavingsRate >= 20,
      dailyMargin: adjustedDailyMargin,
    };

    return {
      activeCycle,
      cycleStartDateStr,
      cycleEndDateStr,
      totalIncome,
      totalExpenses,
      currentMonthRecurring,
      currentMonthVariable,
      potentialSavings,
      adjustedPotentialSavings,
      savingsInvestmentsAmount,
      antExpenses,
      antExpensesTotal,
      recurring,
      totalRecurringNextMonth,
      incomeBreakdown,
      expenseBreakdown,
      savingsMetrics,
      adjustedSavingsMetrics,
    };
  }, [
    transactions,
    recurringThreshold,
    subscriptionMonthsBack,
    antExpenseMonthsBack,
    antExpenseThreshold,
    activeCycle,
  ]);

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
            <label
              htmlFor="recurringThreshold"
              className="text-sm font-medium text-slate-600"
            >
              Min. repeticións recorrentes:
            </label>
            <input
              type="number"
              id="recurringThreshold"
              min="2"
              max="50"
              value={recurringThreshold}
              onChange={(e) =>
                setRecurringThreshold(
                  Math.max(2, parseInt(e.target.value) || 2),
                )
              }
              className="w-16 p-1 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {view === "dashboard" ? (
        <CashflowDashboard
          insights={insights}
          availableCycles={availableCycles}
          selectedCycleId={activeCycle.id}
          setSelectedCycleId={setSelectedCycleId}
          transactions={transactions}
        />
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

function CashflowDashboard({
  insights,
  availableCycles,
  selectedCycleId,
  setSelectedCycleId,
  transactions,
}: {
  insights: any;
  availableCycles: PayrollCycle[];
  selectedCycleId: string;
  setSelectedCycleId: (id: string) => void;
  transactions: Transaction[];
}) {
  const [selectedDetail, setSelectedDetail] = React.useState<{title: string, txs: Transaction[]} | null>(null);
  const [savingsMode, setSavingsMode] = React.useState<"standard" | "adjusted">("standard");

  const isAdjusted = savingsMode === "adjusted";
  const currentSavings = isAdjusted ? insights.adjustedPotentialSavings : insights.potentialSavings;
  const currentMetrics = isAdjusted ? insights.adjustedSavingsMetrics : insights.savingsMetrics;
  const activeCycle = insights.activeCycle || availableCycles[0];

  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(availableCycles.map((c) => c.year)));
    return years.sort((a, b) => b - a);
  }, [availableCycles]);

  const [selectedYear, setSelectedYear] = React.useState<number>(
    activeCycle?.year || new Date().getFullYear(),
  );

  React.useEffect(() => {
    if (activeCycle?.year) {
      setSelectedYear(activeCycle.year);
    }
  }, [activeCycle?.year]);

  const cyclesForSelectedYear = React.useMemo(() => {
    return availableCycles.filter((c) => c.year === selectedYear);
  }, [availableCycles, selectedYear]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const firstCycleInYear = availableCycles.find((c) => c.year === year);
    if (firstCycleInYear) {
      setSelectedCycleId(firstCycleInYear.id);
    }
  };

  return (
    <div className="bg-slate-50 p-6 md:p-10 rounded-3xl border border-slate-100 min-h-[50vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeCycle?.isCurrent ? "Radiografía do Mes Actual" : `Radiografía: ${activeCycle?.monthName} ${activeCycle?.year}`}
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${activeCycle?.isCurrent ? "bg-emerald-500" : "bg-blue-500"}`}></span>
            Ciclo de nómina: <span className="font-semibold text-slate-700">{activeCycle?.dateRangeText}</span>
          </p>
        </div>

        {/* Selector de ano e mes */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <Calendar size={18} className="text-slate-500 shrink-0" />
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Seleccionar ano"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-sm px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Seleccionar mes do ciclo de nómina"
            >
              {cyclesForSelectedYear.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.monthName} {c.isCurrent ? "• Actual" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Waterfall Visualizer */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative">
          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl mb-4 border border-emerald-200">
              +
            </div>
            <div className="w-full min-h-[3.25rem] flex items-center justify-center text-center mb-2">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Ingresos
              </span>
            </div>
            <div className="w-full min-h-[4rem] flex flex-col items-center justify-start mb-6">
              <span className="text-3xl font-black text-emerald-600">
                {insights.totalIncome.toFixed(0)} €
              </span>
            </div>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600 h-[355px] overflow-y-auto pr-1">
              <button onClick={() => setSelectedDetail({ title: "💼 Nómina / Pensión", txs: insights.incomeBreakdown?.nomina?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">💼 Nómina / Pensión</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.nomina.total.toFixed(0)} €</span>
              </button>
              <button onClick={() => setSelectedDetail({ title: "🏠 Aluguer / Hipoteca", txs: insights.incomeBreakdown?.aluguer?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🏠 Aluguer / Hipoteca</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.aluguer.total.toFixed(0)} €</span>
              </button>
              <button onClick={() => setSelectedDetail({ title: "📦 Outros (Ingresos)", txs: insights.incomeBreakdown?.outros?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">📦 Outros</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.outros.total.toFixed(0)} €</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center font-bold text-2xl mb-4 border border-rose-200">
              -
            </div>
            <div className="w-full min-h-[3.25rem] flex items-center justify-center text-center mb-2">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Gastos
              </span>
            </div>
            <div className="w-full min-h-[4rem] flex flex-col items-center justify-start mb-6">
              <span className="text-3xl font-black text-rose-600">
                {insights.totalExpenses.toFixed(0)} €
              </span>
              <span className="text-sm font-bold text-rose-400 mt-1 flex items-center gap-1.5" title="Gastos sen Aforro e Investimento">
                ({(insights.totalExpenses - (insights.expenseBreakdown["Aforro e Investimento"]?.total || 0)).toFixed(0)} €)
                <span className="text-xs font-medium text-slate-400">Gastos menos aforro e investimento</span>
              </span>
            </div>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600 h-[355px] overflow-y-auto pr-1">
              {Object.entries(insights.expenseBreakdown || {})
                .sort((a: any, b: any) => b[1].total - a[1].total)
                .map(([catName, data]: [string, any]) => (
                <button key={catName} onClick={() => setSelectedDetail({ title: catName, txs: data.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                  <span className="truncate pr-2">{catName}</span>
                  <span className="font-bold shrink-0">{data.total.toFixed(0)} €</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center p-4 bg-white z-10 w-full">
            <button
              type="button"
              onClick={() => setSavingsMode(savingsMode === "standard" ? "adjusted" : "standard")}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 border-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ${currentSavings >= 0 ? "bg-slate-900 text-white border-slate-700 hover:border-slate-500" : "bg-rose-600 text-white border-rose-800 hover:border-rose-400"}`}
              title="Preme para cambiar o modo de cálculo"
              aria-label="Cambiar modo de cálculo de aforro"
            >
              =
            </button>
            <div className="w-full min-h-[3.25rem] flex items-center justify-center text-center mb-2 px-1">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                {savingsMode === "standard" ? "Aforro total" : "Aforro total menos Aforro e investimento"}
              </span>
            </div>
            <div className="w-full min-h-[4rem] flex flex-col items-center justify-start mb-6">
              <span
                className={`text-3xl font-black ${currentSavings >= 0 ? "text-slate-900" : "text-rose-600"}`}
              >
                {currentSavings.toFixed(0)} €
              </span>
            </div>
            
            <div className="w-full flex flex-col gap-2 text-sm text-slate-600 h-[355px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">📊 Taxa de aforro</span>
                <span className="font-bold shrink-0">{currentMetrics?.rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">⚖️ Obxectivo</span>
                <span className={`font-bold shrink-0 ${currentMetrics?.isHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentMetrics?.isHealthy ? 'Saudable' : 'Mellorable'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">{activeCycle?.isCurrent ? "🗓️ Marxe diario" : "🗓️ Media diaria"}</span>
                <span className="font-bold shrink-0">{currentMetrics?.dailyMargin.toFixed(0)} €/día</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-900 font-medium">
          A <strong>Radiografía {activeCycle?.isCurrent ? "do Mes Actual" : `de ${activeCycle?.monthName} ${activeCycle?.year}`}</strong> móstrache o resumo de
          ingresos e gastos contabilizados no ciclo de nómina ({activeCycle?.dateRangeText}). O teu{" "}
          <strong>Aforro Total</strong> {savingsMode === "standard" ? "é a diferenza directa entre o que entrou e o que saíu neste ciclo." : "está calculado descontando dos gastos a supercategoría de Aforro e Investimento."}
        </p>
      </div>

      {/* Heatmap Section */}
      <CashflowHeatmap transactions={transactions} />

      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in relative">
            <button 
              onClick={() => setSelectedDetail(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-6 pr-10">{selectedDetail.title}</h3>
            
            <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
              {selectedDetail.txs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Non hai movementos nesta categoría este mes.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-2 text-sm font-bold text-slate-500">Movemento</th>
                      <th className="py-3 px-2 text-sm font-bold text-slate-500">Categoría</th>
                      <th className="py-3 px-2 text-sm font-bold text-slate-500 text-right w-24">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.txs.sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                      <tr key={tx.transaction_id || tx.name+tx.date} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <div className="font-medium text-slate-900 text-sm truncate max-w-[200px]" title={tx.name}>{tx.name}</div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">{tx.date.split("-").reverse().join("/")}</div>
                        </td>
                        <td className="py-3 px-2">
                          {tx.superCategory && <div className="text-xs font-bold text-blue-600 mb-0.5">{tx.superCategory}</div>}
                          <div className="text-xs text-slate-500">{tx.category || "Sen categoría"}</div>
                        </td>
                        <td className={`py-3 px-2 text-right font-black text-sm ${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
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
                <p className="text-sm text-slate-500 font-medium mb-3">
                  Micropagos soltos ({"<"} {antExpenseThreshold}€).
                </p>
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
                    <label
                      htmlFor="antExpenseThreshold"
                      className="text-xs font-medium text-slate-600"
                    >
                      Límite (€):
                    </label>
                    <input
                      type="number"
                      id="antExpenseThreshold"
                      min="1"
                      max="50"
                      value={antExpenseThreshold}
                      onChange={(e) =>
                        setAntExpenseThreshold(
                          Math.max(1, parseInt(e.target.value) || 10),
                        )
                      }
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
              <span className="text-4xl font-black text-slate-900">
                {insights.antExpensesTotal.toFixed(2)} €
              </span>
              <p className="text-sm font-bold text-orange-600 mt-1 uppercase tracking-wider">
                Acumulado este mes
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {insights.antExpenses.length > 0 ? (
                insights.antExpenses.map((tx: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="truncate pr-4 font-medium text-sm text-slate-700">
                      {tx.name}
                    </div>
                    <div className="font-bold text-slate-900 shrink-0">
                      {tx.amount.toFixed(2)} €
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic p-4 text-center">
                  Non tes gastos formiga este mes!
                </div>
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
                <p className="text-sm text-slate-500 font-medium mb-3">
                  Custo medio de servizos recorrentes.
                </p>
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
              <span className="text-4xl font-black text-slate-900">
                {insights.totalRecurringNextMonth.toFixed(2)} €
              </span>
              <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-wider">
                Por mes estimado
              </p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {insights.recurring.length > 0 ? (
                insights.recurring.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        {rec.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {rec.count} pagos detectados
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="font-black text-slate-900 text-right">
                        {rec.avgAmount.toFixed(2)} €
                        <span className="text-xs text-slate-400 font-medium block">
                          /mes
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500 italic p-4 text-center">
                  Non se detectaron subscricións recorrentes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

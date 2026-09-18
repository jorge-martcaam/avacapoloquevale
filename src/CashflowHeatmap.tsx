import { useState, useMemo } from "react";
import { Transaction } from "./lib/firestore";
import { Flame, Info, Calendar, ArrowDownRight, ArrowUpRight } from "lucide-react";

export type HeatmapMetric = "income" | "expenses" | "savings" | "adjustedSavings";
export type HeatmapMode = "average" | "sum";

const DAYS_OF_WEEK = [
  { index: 0, short: "L", name: "Luns" },
  { index: 1, short: "M", name: "Martes" },
  { index: 2, short: "Me", name: "Mércores" },
  { index: 3, short: "X", name: "Xoves" },
  { index: 4, short: "V", name: "Venres" },
  { index: 5, short: "S", name: "Sábado" },
  { index: 6, short: "D", name: "Domingo" },
];

const GALICIAN_MONTHS = [
  "Xaneiro", "Febreiro", "Marzo", "Abril", "Maio", "Xuño",
  "Xullo", "Agosto", "Setembro", "Outubro", "Novembro", "Decembro"
];

function getDayOccurrencesInMonth(year: number, monthZeroIndexed: number): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthZeroIndexed, day);
    const jsDay = d.getDay(); // 0 = Sun, 1 = Mon ...
    const dayIndex = (jsDay + 6) % 7; // 0 = Mon ... 6 = Sun
    counts[dayIndex]++;
  }
  return counts;
}

interface CellData {
  dayIndex: number;
  dayName: string;
  occurrences: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  adjustedSavings: number;
  txCount: number;
}

interface MonthRow {
  monthKey: string; // "YYYY-MM"
  year: number;
  month: number; // 1-12
  monthLabel: string;
  cells: CellData[];
}

export function CashflowHeatmap({ transactions }: { transactions: Transaction[] }) {
  const [metric, setMetric] = useState<HeatmapMetric>("expenses");
  const [mode, setMode] = useState<HeatmapMode>("average");
  const [timeScope, setTimeScope] = useState<string>("all");
  const [hoveredCell, setHoveredCell] = useState<{
    monthLabel: string;
    cell: CellData;
    val: number;
    monthRatio: number;
    globalRatio: number;
  } | null>(null);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 4) {
        const y = parseInt(t.date.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  // Aggregate data by (Month, DayOfWeek)
  const { monthRows, globalMax } = useMemo(() => {
    const rowsMap = new Map<string, MonthRow>();

    // Filter transactions by selected year if not 'all'
    const filteredTxs = timeScope === "all"
      ? transactions
      : transactions.filter((t) => t.date.startsWith(timeScope));

    // Ensure all months in the selected timeframe exist in the map
    if (timeScope !== "all") {
      const selectedYearNum = parseInt(timeScope, 10);
      for (let m = 0; m < 12; m++) {
        const monthKey = `${selectedYearNum}-${String(m + 1).padStart(2, "0")}`;
        const occurrences = getDayOccurrencesInMonth(selectedYearNum, m);
        const cells: CellData[] = DAYS_OF_WEEK.map((d) => ({
          dayIndex: d.index,
          dayName: d.name,
          occurrences: occurrences[d.index],
          totalIncome: 0,
          totalExpenses: 0,
          netSavings: 0,
          adjustedSavings: 0,
          txCount: 0,
        }));
        rowsMap.set(monthKey, {
          monthKey,
          year: selectedYearNum,
          month: m + 1,
          monthLabel: `${GALICIAN_MONTHS[m]} ${selectedYearNum}`,
          cells,
        });
      }
    } else {
      // For all history: populate from min date to max date
      filteredTxs.forEach((t) => {
        if (!t.date || t.date.length < 7) return;
        const monthKey = t.date.substring(0, 7);
        if (!rowsMap.has(monthKey)) {
          const [yStr, mStr] = monthKey.split("-");
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          const occurrences = getDayOccurrencesInMonth(y, m - 1);
          const cells: CellData[] = DAYS_OF_WEEK.map((d) => ({
            dayIndex: d.index,
            dayName: d.name,
            occurrences: occurrences[d.index],
            totalIncome: 0,
            totalExpenses: 0,
            netSavings: 0,
            adjustedSavings: 0,
            txCount: 0,
          }));
          rowsMap.set(monthKey, {
            monthKey,
            year: y,
            month: m,
            monthLabel: `${GALICIAN_MONTHS[m - 1]} ${y}`,
            cells,
          });
        }
      });
    }

    // Populate transaction values into cells
    filteredTxs.forEach((t) => {
      if (!t.date || t.date.length < 10) return;
      const monthKey = t.date.substring(0, 7);
      const row = rowsMap.get(monthKey);
      if (!row) return;

      const [yStr, mStr, dStr] = t.date.split("-");
      const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
      const jsDay = d.getDay();
      const dayIndex = (jsDay + 6) % 7;

      const cell = row.cells[dayIndex];
      cell.txCount++;

      const isSavingsInvestment = t.superCategory === "Aforro e Investimento";

      if (t.amount > 0) {
        cell.totalIncome += t.amount;
        cell.netSavings += t.amount;
        cell.adjustedSavings += t.amount;
      } else if (t.amount < 0) {
        const absVal = Math.abs(t.amount);
        cell.totalExpenses += absVal;
        cell.netSavings -= absVal;
        if (!isSavingsInvestment) {
          cell.adjustedSavings -= absVal;
        }
      }
    });

    // Convert map to array and sort descending by monthKey (most recent first)
    const sortedRows = Array.from(rowsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Calculate global max for current metric & mode
    let maxAbs = 0;
    sortedRows.forEach((row) => {
      row.cells.forEach((cell) => {
        let val = 0;
        switch (metric) {
          case "income":
            val = cell.totalIncome;
            break;
          case "expenses":
            val = cell.totalExpenses;
            break;
          case "savings":
            val = Math.abs(cell.netSavings);
            break;
          case "adjustedSavings":
            val = Math.abs(cell.adjustedSavings);
            break;
        }
        if (mode === "average" && cell.occurrences > 0) {
          val = val / cell.occurrences;
        }
        if (val > maxAbs) maxAbs = val;
      });
    });

    return {
      monthRows: sortedRows,
      globalMax: Math.max(maxAbs, 1),
    };
  }, [transactions, metric, mode, timeScope]);

  // Helper to extract the calculated value for a cell
  const getCellMetricValue = (cell: CellData): number => {
    let val = 0;
    switch (metric) {
      case "income":
        val = cell.totalIncome;
        break;
      case "expenses":
        val = cell.totalExpenses;
        break;
      case "savings":
        val = cell.netSavings;
        break;
      case "adjustedSavings":
        val = cell.adjustedSavings;
        break;
    }
    if (mode === "average") {
      return cell.occurrences > 0 ? val / cell.occurrences : 0;
    }
    return val;
  };

  const getMetricTitle = () => {
    switch (metric) {
      case "income":
        return "Ingresos";
      case "expenses":
        return "Gastos";
      case "savings":
        return "Aforro Total";
      case "adjustedSavings":
        return "Aforro Total (sen Aforro/Inv.)";
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mt-8">
      {/* Header with Title and Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xl">
            <Flame className="text-amber-500" size={22} />
            <h3>Mapa Térmico de Fluxo de Caixa</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Intensidade de cor baseada no <strong>máximo global</strong> de todos os meses.
            Cor do texto e barra indicadora baseadas no <strong>máximo relativo de cada mes</strong>.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Temporal Scope Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
            <Calendar size={15} className="text-slate-500 shrink-0" />
            <select
              value={timeScope}
              onChange={(e) => setTimeScope(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
              aria-label="Ciclo temporal"
            >
              <option value="all">Todo o histórico</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>
                  Ano {y}
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation Mode Selector: Sum vs. Average */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setMode("average")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === "average" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Media diaria de cada día da semana"
            >
              Media / día
            </button>
            <button
              onClick={() => setMode("sum")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === "sum" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Suma total de todos os días da semana dese mes"
            >
              Suma total
            </button>
          </div>
        </div>
      </div>

      {/* Metric Selector Buttons */}
      <div className="flex flex-wrap gap-2 pt-4 pb-6 border-b border-slate-100">
        <button
          onClick={() => setMetric("expenses")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            metric === "expenses"
              ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <ArrowDownRight size={14} className="text-rose-500" />
          Gastos
        </button>

        <button
          onClick={() => setMetric("income")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            metric === "income"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <ArrowUpRight size={14} className="text-emerald-500" />
          Ingresos
        </button>

        <button
          onClick={() => setMetric("savings")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            metric === "savings"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          Aforro Total
        </button>

        <button
          onClick={() => setMetric("adjustedSavings")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            metric === "adjustedSavings"
              ? "bg-blue-50 text-blue-700 border-blue-200 shadow-xs"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
          title="Ingresos menos gastos ordinarios (sen contar achegas a Aforro e Investimento)"
        >
          Aforro (sen Aforro/Inv.)
        </button>
      </div>

      {/* Heatmap Grid Container */}
      <div className="overflow-x-auto pt-6">
        <div className="min-w-[620px]">
          {/* Header Row: Days of Week */}
          <div className="grid grid-cols-[130px_repeat(7,1fr)] gap-2 mb-2 px-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              Mes
            </div>
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d.index}
                className="text-center text-xs font-bold text-slate-600 bg-slate-50 py-1.5 rounded-lg border border-slate-100"
              >
                {d.name}
              </div>
            ))}
          </div>

          {/* Month Rows */}
          {monthRows.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Non hai movementos rexistrados para o período seleccionado.
            </div>
          ) : (
            <div className="space-y-2">
              {monthRows.map((row) => {
                // Calculate local maximum for this specific month
                let monthMax = 0;
                row.cells.forEach((cell) => {
                  const val = Math.abs(getCellMetricValue(cell));
                  if (val > monthMax) monthMax = val;
                });
                monthMax = Math.max(monthMax, 0.001);

                return (
                  <div
                    key={row.monthKey}
                    className="grid grid-cols-[130px_repeat(7,1fr)] gap-2 items-center px-1"
                  >
                    {/* Month Label */}
                    <div className="text-xs font-bold text-slate-800 pr-2 truncate" title={row.monthLabel}>
                      {row.monthLabel}
                    </div>

                    {/* 7 Day of Week Cells */}
                    {row.cells.map((cell) => {
                      const val = getCellMetricValue(cell);
                      const absVal = Math.abs(val);

                      // Global ratio for cell background intensity (0 to 1)
                      const globalRatio = Math.min(1, absVal / globalMax);

                      // Local month ratio for text polarity and indicator bar (0 to 1)
                      const monthRatio = Math.min(1, absVal / monthMax);

                      // Determine background color based on metric
                      let bgColor = "rgba(248, 250, 252, 1)"; // slate-50 default
                      let isDarkBg = false;

                      if (absVal > 0) {
                        if (metric === "expenses") {
                          // Rose / red: soft light to vivid
                          const alpha = 0.08 + globalRatio * 0.82;
                          bgColor = `rgba(244, 63, 94, ${alpha.toFixed(3)})`;
                          isDarkBg = alpha >= 0.48;
                        } else if (metric === "income") {
                          // Emerald / green
                          const alpha = 0.08 + globalRatio * 0.82;
                          bgColor = `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
                          isDarkBg = alpha >= 0.48;
                        } else {
                          // Savings or Adjusted Savings: Bipolar
                          if (val >= 0) {
                            const alpha = 0.08 + globalRatio * 0.82;
                            bgColor = `rgba(16, 185, 129, ${alpha.toFixed(3)})`;
                            isDarkBg = alpha >= 0.48;
                          } else {
                            const alpha = 0.08 + globalRatio * 0.82;
                            bgColor = `rgba(244, 63, 94, ${alpha.toFixed(3)})`;
                            isDarkBg = alpha >= 0.48;
                          }
                        }
                      }

                      // Option B: Adaptive Text Polarity based on local month ratio
                      let textColor = "text-slate-400 font-normal";
                      if (absVal > 0) {
                        if (isDarkBg) {
                          // White text variations
                          if (monthRatio > 0.66) {
                            textColor = "text-white font-black drop-shadow-xs";
                          } else if (monthRatio > 0.33) {
                            textColor = "text-white/95 font-bold";
                          } else {
                            textColor = "text-white/80 font-medium";
                          }
                        } else {
                          // Dark text variations
                          if (monthRatio > 0.66) {
                            textColor = "text-slate-950 font-black";
                          } else if (monthRatio > 0.33) {
                            textColor = "text-slate-800 font-bold";
                          } else {
                            textColor = "text-slate-600 font-medium";
                          }
                        }
                      }

                      // Indicator bar color
                      let barColor = "bg-slate-400";
                      if (absVal > 0) {
                        if (isDarkBg) {
                          barColor = "bg-white";
                        } else if (metric === "expenses") {
                          barColor = "bg-rose-600";
                        } else if (metric === "income") {
                          barColor = "bg-emerald-600";
                        } else {
                          barColor = val >= 0 ? "bg-emerald-600" : "bg-rose-600";
                        }
                      }

                      return (
                        <div
                          key={cell.dayIndex}
                          onMouseEnter={() =>
                            setHoveredCell({
                              monthLabel: row.monthLabel,
                              cell,
                              val,
                              monthRatio,
                              globalRatio,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className="group relative flex flex-col justify-between p-2 rounded-xl border border-slate-200/60 transition-all duration-150 cursor-pointer min-h-[56px]"
                          style={{ backgroundColor: bgColor }}
                        >
                          {/* Value display */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                              {DAYS_OF_WEEK[cell.dayIndex].short}
                            </span>
                            <span className={`text-xs ${textColor} text-right tracking-tight`}>
                              {absVal === 0 ? "0 €" : `${val > 0 && (metric === "savings" || metric === "adjustedSavings") ? "+" : ""}${val.toFixed(0)} €`}
                            </span>
                          </div>

                          {/* Indicator Bar (Option A component embedded as requested) */}
                          <div className="w-full h-1 bg-black/5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${Math.round(monthRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating / Active Tooltip Detail Box */}
      {hoveredCell ? (
        <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white shadow-lg animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
              <span>{hoveredCell.monthLabel}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{hoveredCell.cell.dayName}</span>
              <span>•</span>
              <span>{hoveredCell.cell.occurrences} {hoveredCell.cell.dayName.toLowerCase()}s no mes</span>
            </div>
            <div className="text-lg font-black text-white">
              {getMetricTitle()}:{" "}
              <span className={hoveredCell.val >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {hoveredCell.val > 0 && (metric === "savings" || metric === "adjustedSavings") ? "+" : ""}
                {hoveredCell.val.toFixed(2)} € {mode === "average" ? "/ día" : "total"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 border-t sm:border-t-0 sm:border-l border-slate-700 pt-2 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-slate-400">Transaccións</div>
              <div className="font-bold text-white text-sm">{hoveredCell.cell.txCount}</div>
            </div>
            <div>
              <div className="text-slate-400">Intensidade mensual (barra)</div>
              <div className="font-bold text-amber-400 text-sm">{(hoveredCell.monthRatio * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Intensidade global (fondo)</div>
              <div className="font-bold text-blue-400 text-sm">{(hoveredCell.globalRatio * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-slate-400 shrink-0" />
            <span>Pasa o cursor por calquera cela para ver a análise combinada de suma, media e ocorrencias.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-200"></span>
              <span>Baixo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400"></span>
              <span>Intenso</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

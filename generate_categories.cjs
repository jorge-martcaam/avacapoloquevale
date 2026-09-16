const fs = require('fs');

const code = `import React, { useState, useMemo } from "react";
import { Transaction } from "./lib/firestore";
import {
  Search, Filter, Play, RefreshCw, Trash2, Check, X,
  ChevronDown, ChevronUp, AlertTriangle, Plus, Tag, Inbox, Edit2
} from "lucide-react";
import {
  autoClassifyCurrentTransactions,
  deleteAllLearnedCategories,
  resetAllTransactionCategories,
  updateTransactionsSuperCategory,
  updateTransactionsCategory,
  getTransactionsFromFirestore,
  bulkUpdateTransactionsByNames,
  learnCategory,
  assignSuperCategory,
  renameCategory
} from "./lib/firestore";
import { PREDEFINED_SUPERCATEGORIES } from "./App";

export function CategoriesManager({
  transactions,
  availableCategories,
  setTransactions,
  onUpdateCategory,
}: {
  transactions: Transaction[];
  availableCategories: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"mapa" | "clasificar">("clasificar");

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("mapa")}
          className={\`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 \${activeTab === "mapa" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
        >
          <Tag size={16} /> O teu Mapa
        </button>
        <button
          onClick={() => setActiveTab("clasificar")}
          className={\`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 \${activeTab === "clasificar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
        >
          <Inbox size={16} /> Clasificar
        </button>
      </div>

      {activeTab === "mapa" ? (
        <MapaView transactions={transactions} availableCategories={availableCategories} setTransactions={setTransactions} />
      ) : (
        <ClasificarView transactions={transactions} availableCategories={availableCategories} setTransactions={setTransactions} onUpdateCategory={onUpdateCategory} />
      )}
    </div>
  );
}

function MapaView({
  transactions,
  availableCategories,
  setTransactions
}: {
  transactions: Transaction[];
  availableCategories: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}) {
  const supercategoriesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    // Initialize with predefined
    PREDEFINED_SUPERCATEGORIES.forEach(sc => map.set(sc, new Set()));
    
    // Add dynamically from transactions
    transactions.forEach(tx => {
      const sc = tx.superCategory || "Sen agrupar";
      if (!map.has(sc)) map.set(sc, new Set());
      if (tx.category && tx.category !== "Outros") {
        map.get(sc)!.add(tx.category);
      }
    });

    const result = Array.from(map.entries()).map(([sc, cats]) => ({
      name: sc,
      categories: Array.from(cats).sort((a, b) => a.localeCompare(b))
    }));
    return result.sort((a, b) => {
      if (a.name === "Sen agrupar") return 1;
      if (b.name === "Sen agrupar") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [transactions]);

  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-h-[50vh] animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">O teu Mapa</h2>
        <p className="text-sm text-slate-500 mt-1">Estrutura de categorías para os teus movementos. Aquí podes organizar como se agrupa o teu diñeiro.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {supercategoriesMap.map(sc => (
          <div key={sc.name} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">{sc.name}</h3>
            <div className="flex flex-wrap gap-2">
              {sc.categories.length > 0 ? (
                sc.categories.map(cat => (
                  <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                    {cat}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Sen categorías</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
        <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-blue-900 font-medium">A edición e creación de novas regras estruturais dende esta vista engadirase nas vindeiras actualizacións.</p>
      </div>
    </div>
  );
}

function ClasificarView({
  transactions,
  availableCategories,
  setTransactions,
  onUpdateCategory
}: {
  transactions: Transaction[];
  availableCategories: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAutoClassify = async () => {
    setIsAutoClassifying(true);
    try {
      const updatedCount = await autoClassifyCurrentTransactions();
      const reloadedTxs = await getTransactionsFromFirestore();
      setTransactions(reloadedTxs);
      if (updatedCount && updatedCount > 0) {
        alert(\`Auto-clasificación completada. Actualizáronse \${updatedCount} movementos.\`);
      } else {
        alert("Non se atoparon movementos novos para auto-clasificar coas regras actuais.");
      }
    } catch (e) {
      console.error(e);
      alert("Houbo un erro ao auto-clasificar os movementos.");
    } finally {
      setIsAutoClassifying(false);
    }
  };

  const filteredTx = useMemo(() => {
    let filtered = transactions;
    if (filter === "pending") {
      filtered = filtered.filter(t => !t.category || t.category === "Outros");
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)));
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter, searchQuery]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Bandexa de Entrada</h2>
          <p className="text-sm text-slate-500 mt-1">Clasifica os movementos soltos para afinar a túa radiografía.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoClassify}
            disabled={isAutoClassifying}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isAutoClassifying ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            Auto-clasificar
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setFilter("pending")}
            className={\`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors \${filter === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={\`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors \${filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
          >
            Todos
          </button>
        </div>
        
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar movemento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {filteredTx.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100">
          <Check size={48} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Todo ao día</h3>
          <p className="text-slate-500 mt-1">Non tes movementos pendentes de clasificar.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredTx.map(tx => (
            <TxRow 
              key={tx.id || tx.date + tx.name + tx.amount} 
              tx={tx} 
              availableCategories={availableCategories} 
              onUpdate={async (newCat) => {
                if (tx.id) await onUpdateCategory(tx.id, newCat);
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, availableCategories, onUpdate }: { tx: Transaction, availableCategories: string[], onUpdate: (c: string) => Promise<void> }) {
  const [val, setVal] = useState(tx.category || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setVal(newVal);
    setSaving(true);
    await onUpdate(newVal);
    setSaving(false);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 truncate">{tx.name}</span>
          <span className="text-xs text-slate-400 font-medium">{tx.date.split("-").reverse().join("/")}</span>
        </div>
        <div className={\`font-black \${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}\`}>
          {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} €
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {saving && <RefreshCw size={14} className="animate-spin text-blue-500" />}
        <select
          value={val}
          onChange={handleSave}
          disabled={saving}
          className="w-full sm:w-48 p-2 text-sm bg-slate-100 border-none rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 cursor-pointer"
        >
          <option value="">Sen categoría</option>
          {availableCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager rewritten.');

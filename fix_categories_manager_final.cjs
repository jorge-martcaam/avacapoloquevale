const fs = require('fs');

// We have the newMapaView from replace_mapaview.cjs
const replaceScript = fs.readFileSync('replace_mapaview.cjs', 'utf8');
const match = replaceScript.match(/const newMapaView = `([\s\S]+?)`;/);
const newMapaView = match ? match[1] : '';

// And we have the delete handlers from patch_categories_manager.cjs
const patchScript = fs.readFileSync('patch_categories_manager.cjs', 'utf8');
const handlersInsertMatch = patchScript.match(/const handlersInsert = `([\s\S]+?)`;/);
const handlersInsert = handlersInsertMatch ? handlersInsertMatch[1] : '';

let finalMapaView = newMapaView;
if (handlersInsert) {
  finalMapaView = finalMapaView.replace(/  const handleCreateCat = async \(\) => \{[\s\S]*?  \};\n/, match => match + handlersInsert);
  finalMapaView = finalMapaView.replace(/<span key=\{sc\} className="px-3 py-1\.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200">\n                \{sc\}\n              <\/span>/g, `<span key={sc} className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200 flex items-center gap-2">
                {sc}
                {true && (
                  <button 
                    onClick={() => handleDeleteSuperCat(sc)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>`);
  finalMapaView = finalMapaView.replace(/<td className="py-3 px-4">\n                        <button \n                          onClick=\{\(\) => handleEditClick\(cat, sc\)\}\n                          className="p-1\.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"\n                          title="Editar"\n                        >\n                          <Edit2 size=\{16\} \/>\n                        <\/button>\n                      <\/td>/g, `<td className="py-3 px-4 flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(cat, sc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {true && (
                          <button 
                            onClick={() => handleDeleteCat(cat)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>`);
}

// We need the handleSave fix for CategoriesManager
const fixHandleSaveScript = fs.readFileSync('fix_handle_save.cjs', 'utf8');
const handleSaveNew = fixHandleSaveScript.match(/const newHandleSave = `([\s\S]+?)`;/)[1];
const handleSaveOld = fixHandleSaveScript.match(/const oldHandleSave = `([\s\S]+?)`;/)[1];
finalMapaView = finalMapaView.replace(handleSaveOld, handleSaveNew);


// Get the current corrupted file
const currentCode = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// The top part is okay up to ClasificarView call
const topRegex = /([\s\S]+?<ClasificarView[^>]+>[\s\S]+?\}[\s\S]+?<\/div>[\s\S]+?\})/;
const topMatch = currentCode.match(topRegex);
if (!topMatch) {
  console.log("Could not extract top part");
}

let code = `import React, { useState, useMemo } from "react";
import { Transaction } from "./lib/firestore";
import { Search, Play, RefreshCw, Check, AlertTriangle, Tag, Inbox, Edit2, X, Plus, Trash2 } from "lucide-react";
import {
  autoClassifyCurrentTransactions,
  getTransactionsFromFirestore,
  renameCategory,
  assignSuperCategory,
  addCustomCategory,
  addCustomSuperCategory,
  removeCustomCategory,
  removeCustomSuperCategory,
  bulkUpdateTransactionsByNames
} from "./lib/firestore";
import { PREDEFINED_SUPERCATEGORIES, /* PREDEFINED_CATEGORIES */ } from "./App";
import { MassEditModal } from "./MassEditModal";

export function CategoriesManager({
  transactions,
  availableCategories,
  availableSuperCategories,
  customCategoriesMap,
  customSuperCategories,
  setCustomCategoriesMap,
  setCustomSuperCategories,
  setTransactions,
  onUpdateCategory,
  onUpdateSuperCategory,
}: {
  transactions: Transaction[];
  availableCategories: string[];
  availableSuperCategories: string[];
  customCategoriesMap: Record<string, string>;
  customSuperCategories: string[];
  setCustomCategoriesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCustomSuperCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;
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
        <MapaView 
           transactions={transactions} 
           setTransactions={setTransactions} 
           availableCategories={availableCategories}
          availableSuperCategories={availableSuperCategories} 
           customCategoriesMap={customCategoriesMap}
          customSuperCategories={customSuperCategories}
          setCustomCategoriesMap={setCustomCategoriesMap}
          setCustomSuperCategories={setCustomSuperCategories}
        />
      ) : (
        <ClasificarView 
          transactions={transactions} 
          availableCategories={availableCategories} 
          availableSuperCategories={availableSuperCategories} 
          setTransactions={setTransactions} 
          onUpdateCategory={onUpdateCategory} 
          onUpdateSuperCategory={onUpdateSuperCategory} 
        />
      )}
    </div>
  );
}

${finalMapaView}

function ClasificarView({
  transactions,
  availableCategories,
  availableSuperCategories,
  setTransactions,
  onUpdateCategory,
  onUpdateSuperCategory
}: {
  transactions: Transaction[];
  availableCategories: string[];
  availableSuperCategories: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [showMassEditModal, setShowMassEditModal] = useState(false);
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
            onClick={() => setShowMassEditModal(true)}
            className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            <Edit2 size={16} />
            Edición masiva
          </button>
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
               key={tx.transaction_id || tx.date + tx.name + tx.amount} 
               tx={tx} 
               availableCategories={availableCategories} 
               availableSuperCategories={availableSuperCategories}
              onUpdate={async (newCat) => {
                if (tx.transaction_id) await onUpdateCategory(tx.transaction_id, newCat);
              }}
              onUpdateSuper={async (newSuperCat) => {
                if (tx.transaction_id) await onUpdateSuperCategory(tx.transaction_id, newSuperCat);
              }}
            />
          ))}
        </div>
      )}

      {showMassEditModal && (
        <MassEditModal 
          transactions={transactions} 
          availableCategories={availableCategories}
          availableSuperCategories={availableSuperCategories}
          onClose={() => setShowMassEditModal(false)}
          onSuccess={async () => {
            const reloadedTxs = await getTransactionsFromFirestore();
            setTransactions(reloadedTxs);
          }}
        />
      )}
    </div>
  );
}

function TxRow({ 
  tx, 
  availableCategories, 
  availableSuperCategories,
  onUpdate,
  onUpdateSuper
}: { 
  tx: Transaction, 
  availableCategories: string[], 
  availableSuperCategories: string[],
  onUpdate: (c: string) => Promise<void>,
  onUpdateSuper: (sc: string) => Promise<void>
}) {
  const [val, setVal] = useState(tx.category || "");
  const [superVal, setSuperVal] = useState(tx.superCategory || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setVal(newVal);
    setSaving(true);
    await onUpdate(newVal);
    setSaving(false);
  };

  const handleSuperSave = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSuperVal = e.target.value;
    setSuperVal(newSuperVal);
    setSaving(true);
    await onUpdateSuper(newSuperVal);
    setSaving(false);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 group gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 truncate">{tx.name}</span>
          <span className="text-xs text-slate-400 font-medium">{tx.date.split("-").reverse().join("/")}</span>
        </div>
        <div className={\`font-black \${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}\`}>
          {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} €
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
        {saving && <RefreshCw size={14} className="animate-spin text-blue-500 shrink-0" />}
        <select
          value={superVal}
          onChange={handleSuperSave}
          disabled={saving}
          className="w-full sm:w-40 p-2 text-sm bg-slate-100 border-none rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 cursor-pointer"
        >
          <option value="">Sen supercategoría</option>
          {availableSuperCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
console.log("CategoriesManager reconstructed successfully!");

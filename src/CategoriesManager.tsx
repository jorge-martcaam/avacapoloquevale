import React, { useState, useMemo } from "react";
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
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${activeTab === "mapa" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Tag size={16} /> O teu Mapa
        </button>
        <button
          onClick={() => setActiveTab("clasificar")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${activeTab === "clasificar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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

function MapaView({
  transactions,
  setTransactions,
  availableCategories,
  availableSuperCategories,
  customCategoriesMap,
  customSuperCategories,
  setCustomCategoriesMap,
  setCustomSuperCategories
}: {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  availableCategories: string[];
  availableSuperCategories: string[];
  customCategoriesMap: Record<string, string>;
  customSuperCategories: string[];
  setCustomCategoriesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCustomSuperCategories: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [editingCategory, setEditingCategory] = useState<{name: string, superCategory: string} | null>(null);
  const [editName, setEditName] = useState("");
  const [editSuper, setEditSuper] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [newSuperCat, setNewSuperCat] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatSuper, setNewCatSuper] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const supercategoriesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    PREDEFINED_SUPERCATEGORIES.forEach(sc => map.set(sc, new Set()));
    customSuperCategories.forEach(sc => map.set(sc, new Set()));
    Object.values(customCategoriesMap).forEach(sc => {
      if (!map.has(sc)) map.set(sc, new Set());
    });
    
    Object.entries(customCategoriesMap).forEach(([cat, sc]) => {
      if (!map.has(sc)) map.set(sc, new Set());
      map.get(sc)!.add(cat);
    });

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
  }, [transactions, customCategoriesMap, customSuperCategories]);

  const handleEditClick = (cat: string, sc: string) => {
    setEditingCategory({name: cat, superCategory: sc});
    setEditName(cat);
    setEditSuper(sc);
  };

  const handleSave = async () => {
    if (!editingCategory) return;
    setIsSaving(true);
    try {
      if (editName !== editingCategory.name) {
        await renameCategory(editingCategory.name, editName, editingCategory.superCategory !== "Sen agrupar" ? editingCategory.superCategory : undefined);
      }
      if (editSuper !== editingCategory.superCategory && editSuper !== "Sen agrupar") {
        await assignSuperCategory(editName || editingCategory.name, editSuper, editingCategory.superCategory !== "Sen agrupar" ? editingCategory.superCategory : undefined);
      }
      
      if (editName !== editingCategory.name) {
        await removeCustomCategory(editingCategory.name);
        setCustomCategoriesMap(prev => {
          const newMap = {...prev};
          delete newMap[editingCategory.name];
          newMap[editName] = editSuper;
          return newMap;
        });
      } else {
        setCustomCategoriesMap(prev => ({...prev, [editName]: editSuper}));
      }
      await addCustomCategory(editName || editingCategory.name, editSuper);
      
      const updatedTxs = await getTransactionsFromFirestore();
      setTransactions(updatedTxs);
      setEditingCategory(null);
    } catch(e) {
      console.error(e);
      alert("Erro ao gardar a categoría");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSuperCat = async () => {
    if (!newSuperCat.trim()) return;
    setIsCreating(true);
    await addCustomSuperCategory(newSuperCat.trim());
    setCustomSuperCategories(prev => [...prev, newSuperCat.trim()]);
    setNewSuperCat("");
    setIsCreating(false);
  };

  const handleCreateCat = async () => {
    if (!newCatName.trim() || !newCatSuper.trim()) return;
    setIsCreating(true);
    await addCustomCategory(newCatName.trim(), newCatSuper.trim());
    setCustomCategoriesMap(prev => ({...prev, [newCatName.trim()]: newCatSuper.trim()}));
    setNewCatName("");
    setNewCatSuper("");
    setIsCreating(false);
  };

  const handleDeleteSuperCat = async (sc: string) => {
    if (confirm(`Estás seguro de querer eliminar a supercategoría "${sc}"?`)) {
      await removeCustomSuperCategory(sc);
      setCustomSuperCategories(prev => prev.filter(s => s !== sc));
    }
  };

  const handleDeleteCat = async (cat: string) => {
    if (confirm(`Estás seguro de querer eliminar a categoría "${cat}"?`)) {
      await removeCustomCategory(cat);
      setCustomCategoriesMap(prev => {
        const newMap = {...prev};
        delete newMap[cat];
        return newMap;
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-h-[40vh]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">O teu Mapa</h2>
          <p className="text-sm text-slate-500 mt-1">Estrutura de categorías para os teus movementos. Fai clic nunha categoría para editala.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supercategoriesMap.map(sc => (
            <div key={sc.name} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative group">
              <h3 className="font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                {sc.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {sc.categories.length > 0 ? (
                  sc.categories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => handleEditClick(cat, sc.name)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium rounded-full border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {cat}
                      <Edit2 size={10} className="opacity-50" />
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Sen categorías</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Xestionar Supercategorías</h3>
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Nova supercategoría..."
              value={newSuperCat}
              onChange={e => setNewSuperCat(e.target.value)}
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleCreateSuperCat}
              disabled={isCreating || !newSuperCat.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} /> Engadir
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuperCategories.map(sc => (
              <span key={sc} className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200 flex items-center gap-2">
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
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Xestionar Categorías</h3>
          <div className="flex flex-col md:flex-row items-center gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Nova categoría..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="w-full md:flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select 
              value={newCatSuper}
              onChange={e => setNewCatSuper(e.target.value)}
              className="w-full md:w-64 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona supercategoría</option>
              {availableSuperCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button 
              onClick={handleCreateCat}
              disabled={isCreating || !newCatName.trim() || !newCatSuper.trim()}
              className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Engadir
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-sm font-bold text-slate-500">Categoría</th>
                  <th className="py-3 px-4 text-sm font-bold text-slate-500">Supercategoría</th>
                  <th className="py-3 px-4 text-sm font-bold text-slate-500 w-24">Accións</th>
                </tr>
              </thead>
              <tbody>
                {availableCategories.map(cat => {
                  // Find supercategory
                  const mapEntry = supercategoriesMap.find(sm => sm.categories.includes(cat));
                  const sc = mapEntry ? mapEntry.name : "Sen agrupar";
                  return (
                    <tr key={cat} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{cat}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{sc}</td>
                      <td className="py-3 px-4 flex items-center gap-2">
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingCategory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl relative animate-fade-in">
            <button 
              onClick={() => setEditingCategory(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-6">Editar Categoría</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da categoría</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Supercategoría (Grupo)</label>
                <select 
                  value={editSuper}
                  onChange={e => setEditSuper(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Sen agrupar">Sen agrupar</option>
                  {availableSuperCategories.filter(c => c !== "Sen agrupar").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaving || !editName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 mt-4"
              >
                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                Gardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


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
        alert(`Auto-clasificación completada. Actualizáronse ${updatedCount} movementos.`);
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
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
        <div className={`font-black ${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}`}>
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

import { useState, useMemo } from "react";
import { Transaction, bulkUpdateTransactionsByNames } from "./lib/firestore";
import { X, Save, RefreshCw, Layers } from "lucide-react";

export function MassEditModal({
  transactions,
  availableCategories,
  availableSuperCategories,
  onClose,
  onSuccess
}: {
  transactions: Transaction[];
  availableCategories: string[];
  availableSuperCategories: string[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  // Group transactions by name and count them
  const groupedData = useMemo(() => {
    const groups: Record<string, { count: number; category: string; superCategory: string; name: string }> = {};
    for (const tx of transactions) {
      if (!groups[tx.name]) {
        groups[tx.name] = { 
          name: tx.name, 
          count: 0, 
          category: tx.category || "", 
          superCategory: tx.superCategory || "" 
        };
      }
      groups[tx.name].count++;
    }
    return Object.values(groups).sort((a, b) => b.count - a.count); // desc by count
  }, [transactions]);

  // Local state for edits
  const [edits, setEdits] = useState<Record<string, { category: string; superCategory: string }>>({});

  const handleCategoryChange = (name: string, val: string) => {
    setEdits(prev => ({
      ...prev,
      [name]: { ...prev[name], category: val, superCategory: prev[name]?.superCategory ?? groupedData.find(g => g.name === name)?.superCategory ?? "" }
    }));
  };

  const handleSuperCategoryChange = (name: string, val: string) => {
    setEdits(prev => ({
      ...prev,
      [name]: { ...prev[name], superCategory: val, category: prev[name]?.category ?? groupedData.find(g => g.name === name)?.category ?? "" }
    }));
  };

  const handleSave = async (name: string) => {
    const changes = edits[name];
    if (!changes) return;
    
    setUpdatingName(name);
    try {
      await bulkUpdateTransactionsByNames([name], changes.category, changes.superCategory);
      // Wait to re-fetch
      await onSuccess();
      // Clear edits for this name so it resets
      setEdits(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao actualizar os movementos");
    } finally {
      setUpdatingName(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
        >
          <X size={16} />
        </button>

        <div className="mb-6 pr-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="text-blue-500" />
            Edición Masiva
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Revisa e actualiza grupos de movementos idénticos á vez, ordenados pola cantidade de repeticións.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-slate-200">
                <th className="py-3 px-2 text-sm font-bold text-slate-500">Movemento</th>
                <th className="py-3 px-2 text-sm font-bold text-slate-500 text-center w-20">Cantidade</th>
                <th className="py-3 px-2 text-sm font-bold text-slate-500 w-48">Categoría</th>
                <th className="py-3 px-2 text-sm font-bold text-slate-500 w-48">Supercategoría</th>
                <th className="py-3 px-2 text-sm font-bold text-slate-500 w-24 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((group) => {
                const currentCat = edits[group.name]?.category ?? group.category;
                const currentSuper = edits[group.name]?.superCategory ?? group.superCategory;
                const hasChanges = edits[group.name] !== undefined;
                const isUpdating = updatingName === group.name;

                return (
                  <tr key={group.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-2 text-sm font-medium text-slate-900 max-w-[200px] truncate" title={group.name}>
                      {group.name}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200 min-w-[2rem]">
                        {group.count}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={currentCat}
                        onChange={e => handleCategoryChange(group.name, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sen clasificar</option>
                        {availableCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={currentSuper}
                        onChange={e => handleSuperCategoryChange(group.name, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sen agrupar</option>
                        {availableSuperCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleSave(group.name)}
                        disabled={!hasChanges || isUpdating}
                        className={`w-full flex items-center justify-center gap-1 p-2 rounded-lg text-sm font-bold transition-colors ${
                          hasChanges 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {isUpdating ? "" : "Gardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {groupedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    Non hai movementos para clasificar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

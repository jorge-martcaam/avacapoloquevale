const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Fix MapaView call
code = code.replace(
  /<MapaView transactions=\{transactions\} \/>/s,
  `<MapaView transactions={transactions} setTransactions={setTransactions} availableSuperCategories={availableSuperCategories} />`
);

// Rewrite MapaView completely
const oldMapaViewRegex = /function MapaView\(\{\n  transactions,\n  \}: \{\n  transactions: Transaction\[\];\n  \}\) \{\n.*?(?=function ClasificarView)/s;

const newMapaView = `function MapaView({
  transactions,
  setTransactions,
  availableSuperCategories
}: {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  availableSuperCategories: string[];
}) {
  const [editingCategory, setEditingCategory] = useState<{name: string, superCategory: string} | null>(null);
  const [editName, setEditName] = useState("");
  const [editSuper, setEditSuper] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-h-[50vh] animate-fade-in">
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
`;

code = code.replace(oldMapaViewRegex, newMapaView);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Rewrote MapaView to include Edit modal');

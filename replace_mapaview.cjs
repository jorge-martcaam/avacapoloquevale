const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

const mapaviewRegex = /function MapaView\(\{\n  transactions,\n  setTransactions,\n  availableSuperCategories\n\}: \{\n  transactions: Transaction\[\];\n  setTransactions: React\.Dispatch<React\.SetStateAction<Transaction\[\]>>;\n  availableSuperCategories: string\[\];\n\}\) \{.*?(?=function ClasificarView)/s;

const newMapaView = `function MapaView({
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
      
      await addCustomCategory(editName || editingCategory.name, editSuper);
      setCustomCategoriesMap(prev => ({...prev, [editName || editingCategory.name]: editSuper}));
      
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
              <span key={sc} className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200">
                {sc}
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
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => handleEditClick(cat, sc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
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
`;

code = code.replace(mapaviewRegex, newMapaView);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Rewrote MapaView to include table manager');

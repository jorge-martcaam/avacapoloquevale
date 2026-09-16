const fs = require('fs');

let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Update CategoriesManager signature
code = code.replace(
  /export function CategoriesManager\(\{\n  transactions,\n  availableCategories,\n  setTransactions,\n  onUpdateCategory,\n\}: \{/s,
  `export function CategoriesManager({\n  transactions,\n  availableCategories,\n  availableSuperCategories,\n  setTransactions,\n  onUpdateCategory,\n  onUpdateSuperCategory,\n}: {`
);

code = code.replace(
  /availableCategories: string\[\];\n  setTransactions: React\.Dispatch<React\.SetStateAction<Transaction\[\]>>;\n  onUpdateCategory: \(txId: string, newCategory: string\) => Promise<void>;\n\}\) \{/s,
  `availableCategories: string[];\n  availableSuperCategories: string[];\n  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;\n  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;\n  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;\n}) {`
);

// Update ClasificarView call
code = code.replace(
  /<ClasificarView transactions=\{transactions\} availableCategories=\{availableCategories\} setTransactions=\{setTransactions\} onUpdateCategory=\{onUpdateCategory\} \/>/s,
  `<ClasificarView transactions={transactions} availableCategories={availableCategories} availableSuperCategories={availableSuperCategories} setTransactions={setTransactions} onUpdateCategory={onUpdateCategory} onUpdateSuperCategory={onUpdateSuperCategory} />`
);

// Update ClasificarView signature
code = code.replace(
  /function ClasificarView\(\{\n  transactions,\n  availableCategories,\n  setTransactions,\n  onUpdateCategory\n\}: \{/s,
  `function ClasificarView({\n  transactions,\n  availableCategories,\n  availableSuperCategories,\n  setTransactions,\n  onUpdateCategory,\n  onUpdateSuperCategory\n}: {`
);

code = code.replace(
  /availableCategories: string\[\];\n  setTransactions: React\.Dispatch<React\.SetStateAction<Transaction\[\]>>;\n  onUpdateCategory: \(txId: string, newCategory: string\) => Promise<void>;\n\}\) \{/s,
  `availableCategories: string[];\n  availableSuperCategories: string[];\n  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;\n  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;\n  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;\n}) {`
);

// Update TxRow call inside ClasificarView
code = code.replace(
  /<TxRow \n              key=\{tx\.transaction_id \|\| tx\.date \+ tx\.name \+ tx\.amount\} \n              tx=\{tx\} \n              availableCategories=\{availableCategories\} \n              onUpdate=\{async \(newCat\) => \{\n                if \(tx\.transaction_id\) await onUpdateCategory\(tx\.transaction_id, newCat\);\n              \}\} \n            \/>/s,
  `<TxRow 
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
            />`
);

// Update TxRow signature and body
const oldTxRow = `function TxRow({ tx, availableCategories, onUpdate }: { tx: Transaction, availableCategories: string[], onUpdate: (c: string) => Promise<void> }) {
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
}`;

const newTxRow = `function TxRow({ 
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
}`;

code = code.replace(oldTxRow, newTxRow);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager updated with supercategories');

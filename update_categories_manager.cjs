const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Update imports
code = code.replace(
  /import \{\n  autoClassifyCurrentTransactions,\n  getTransactionsFromFirestore,\n  renameCategory,\n  assignSuperCategory\n\} from "\.\/lib\/firestore";/s,
  `import {
  autoClassifyCurrentTransactions,
  getTransactionsFromFirestore,
  renameCategory,
  assignSuperCategory,
  addCustomCategory,
  addCustomSuperCategory,
  removeCustomCategory
} from "./lib/firestore";`
);
code = code.replace(/import \{ Search, Play, RefreshCw, Check, AlertTriangle, Tag, Inbox, Edit2, X, Plus \} from "lucide-react";/, 'import { Search, Play, RefreshCw, Check, AlertTriangle, Tag, Inbox, Edit2, X, Plus, Trash2 } from "lucide-react";');

// Update CategoriesManager signature
code = code.replace(
  /export function CategoriesManager\(\{\n  transactions,\n  availableCategories,\n  availableSuperCategories,\n  setTransactions,\n  onUpdateCategory,\n  onUpdateSuperCategory,\n\}: \{/s,
  `export function CategoriesManager({
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
}: {`
);

code = code.replace(
  /  availableSuperCategories: string\[\];\n  setTransactions: React\.Dispatch<React\.SetStateAction<Transaction\[\]>>;\n  onUpdateCategory: \(txId: string, newCategory: string\) => Promise<void>;\n  onUpdateSuperCategory: \(txId: string, newSuperCategory: string\) => Promise<void>;\n\}\) \{/s,
  `  availableSuperCategories: string[];
  customCategoriesMap: Record<string, string>;
  customSuperCategories: string[];
  setCustomCategoriesMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCustomSuperCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;
}) {`
);

// Update MapaView call
code = code.replace(
  /<MapaView transactions=\{transactions\} setTransactions=\{setTransactions\} availableSuperCategories=\{availableSuperCategories\} \/>/s,
  `<MapaView 
          transactions={transactions} 
          setTransactions={setTransactions} 
          availableCategories={availableCategories}
          availableSuperCategories={availableSuperCategories} 
          customCategoriesMap={customCategoriesMap}
          customSuperCategories={customSuperCategories}
          setCustomCategoriesMap={setCustomCategoriesMap}
          setCustomSuperCategories={setCustomSuperCategories}
        />`
);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager updated signature');

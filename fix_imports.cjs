const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Ensure firestore functions are imported
code = code.replace(
  /import \{\n  autoClassifyCurrentTransactions,\n  getTransactionsFromFirestore\n\} from "\.\/lib\/firestore";/s,
  `import {
  autoClassifyCurrentTransactions,
  getTransactionsFromFirestore,
  renameCategory,
  assignSuperCategory
} from "./lib/firestore";`
);

// Ensure lucide icons are imported
code = code.replace(
  /import \{ Search, Play, RefreshCw, Check, AlertTriangle, Tag, Inbox \} from "lucide-react";/s,
  `import { Search, Play, RefreshCw, Check, AlertTriangle, Tag, Inbox, Edit2, X, Plus } from "lucide-react";`
);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Fixed imports');

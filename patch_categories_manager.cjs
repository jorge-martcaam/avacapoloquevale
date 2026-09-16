const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Import removeCustomSuperCategory and PREDEFINED_CATEGORIES
code = code.replace(/import \{\n  autoClassifyCurrentTransactions,\n  getTransactionsFromFirestore,\n  renameCategory,\n  assignSuperCategory,\n  addCustomCategory,\n  addCustomSuperCategory,\n  removeCustomCategory\n\} from "\.\/lib\/firestore";/, `import {
  autoClassifyCurrentTransactions,
  getTransactionsFromFirestore,
  renameCategory,
  assignSuperCategory,
  addCustomCategory,
  addCustomSuperCategory,
  removeCustomCategory,
  removeCustomSuperCategory
} from "./lib/firestore";`);

code = code.replace(/import \{ PREDEFINED_SUPERCATEGORIES \} from "\.\/App";/, `import { PREDEFINED_SUPERCATEGORIES, PREDEFINED_CATEGORIES } from "./App";`);

// Add delete handlers
const handlersInsert = `
  const handleDeleteSuperCat = async (sc: string) => {
    if (confirm(\`Estás seguro de querer eliminar a supercategoría "\${sc}"?\`)) {
      await removeCustomSuperCategory(sc);
      setCustomSuperCategories(prev => prev.filter(s => s !== sc));
    }
  };

  const handleDeleteCat = async (cat: string) => {
    if (confirm(\`Estás seguro de querer eliminar a categoría "\${cat}"?\`)) {
      await removeCustomCategory(cat);
      setCustomCategoriesMap(prev => {
        const newMap = {...prev};
        delete newMap[cat];
        return newMap;
      });
    }
  };
`;

code = code.replace(/  const handleCreateCat = async \(\) => \{.*?\n  \};\n/s, match => match + handlersInsert);

// Add delete button for supercategories
code = code.replace(/<span key=\{sc\} className="px-3 py-1\.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200">\n                \{sc\}\n              <\/span>/g, `<span key={sc} className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg border border-slate-200 flex items-center gap-2">
                {sc}
                {!PREDEFINED_SUPERCATEGORIES.includes(sc) && (
                  <button 
                    onClick={() => handleDeleteSuperCat(sc)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>`);

// Add delete button in table for categories
code = code.replace(/<td className="py-3 px-4">\n                        <button \n                          onClick=\{\(\) => handleEditClick\(cat, sc\)\}\n                          className="p-1\.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"\n                          title="Editar"\n                        >\n                          <Edit2 size=\{16\} \/>\n                        <\/button>\n                      <\/td>/g, `<td className="py-3 px-4 flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(cat, sc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {(!PREDEFINED_CATEGORIES.includes(cat) || customCategoriesMap[cat]) && (
                          <button 
                            onClick={() => handleDeleteCat(cat)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>`);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager patched with delete buttons');

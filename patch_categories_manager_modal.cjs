const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Add import
if (!code.includes('import { MassEditModal }')) {
  code = code.replace(
    'import { PREDEFINED_SUPERCATEGORIES, PREDEFINED_CATEGORIES } from "./App";',
    'import { PREDEFINED_SUPERCATEGORIES, PREDEFINED_CATEGORIES } from "./App";\nimport { MassEditModal } from "./MassEditModal";'
  );
}

// Add state
if (!code.includes('const [showMassEditModal, setShowMassEditModal] = useState(false);')) {
  code = code.replace(
    '  const [isAutoClassifying, setIsAutoClassifying] = useState(false);',
    '  const [isAutoClassifying, setIsAutoClassifying] = useState(false);\n  const [showMassEditModal, setShowMassEditModal] = useState(false);'
  );
}

// Add button
if (!code.includes('setShowMassEditModal(true)')) {
  code = code.replace(
    '          <button\n            onClick={handleAutoClassify}',
    `          <button
            onClick={() => setShowMassEditModal(true)}
            className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            <Edit2 size={16} />
            Edición masiva
          </button>
          <button
            onClick={handleAutoClassify}`
  );
}

// Add modal render
if (!code.includes('<MassEditModal')) {
  code = code.replace(
    '    </div>\n  );\n}\n',
    `      {showMassEditModal && (
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
`
  );
}

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager patched with MassEditModal');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const availCatsInsert = `  const availableCategories = Array.from(
    new Set([
      ...PREDEFINED_CATEGORIES,
      ...Object.keys(customCategoriesMap),
      ...(transactions.map((tx) => tx.category).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const availableSuperCategories = Array.from(
    new Set([
      ...PREDEFINED_SUPERCATEGORIES,
      ...customSuperCategories,
      ...Object.values(customCategoriesMap),
      ...(transactions.map((tx) => tx.superCategory).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));`;

const oldAvailCats = /  const availableCategories = Array\.from\(\n    new Set\(\[\n      \.\.\.PREDEFINED_CATEGORIES,\n      \.\.\.\(transactions\.map\(\(tx\) => tx\.category\)\.filter\(Boolean\) as string\[\]\),\n    \]\),\n  \)\.sort\(\(a, b\) => a\.localeCompare\(b\)\);\n\n  const availableSuperCategories = Array\.from\(\n    new Set\(\[\n      \.\.\.PREDEFINED_SUPERCATEGORIES,\n      \.\.\.\(transactions\.map\(\(tx\) => tx\.superCategory\)\.filter\(Boolean\) as string\[\]\),\n    \]\),\n  \)\.sort\(\(a, b\) => a\.localeCompare\(b\)\);/s;

code = code.replace(oldAvailCats, availCatsInsert);

// Now pass the custom maps to CategoriesManager
code = code.replace(/<CategoriesManager\n                transactions=\{transactions\}\n                availableCategories=\{availableCategories\}\n                availableSuperCategories=\{availableSuperCategories\}\n                setTransactions=\{setTransactions\}\n                onUpdateCategory=\{handleUpdateCategory\}\n                onUpdateSuperCategory=\{handleUpdateSuperCategory\}\n              \/>/s, `<CategoriesManager
                transactions={transactions}
                availableCategories={availableCategories}
                availableSuperCategories={availableSuperCategories}
                customCategoriesMap={customCategoriesMap}
                customSuperCategories={customSuperCategories}
                setCustomCategoriesMap={setCustomCategoriesMap}
                setCustomSuperCategories={setCustomSuperCategories}
                setTransactions={setTransactions}
                onUpdateCategory={handleUpdateCategory}
                onUpdateSuperCategory={handleUpdateSuperCategory}
              />`);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated available cats and CategoriesManager props');

const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

if (!code.includes('bulkUpdateTransactionsByNames')) {
  code = code.replace(
    '  removeCustomSuperCategory\n}',
    '  removeCustomSuperCategory,\n  bulkUpdateTransactionsByNames\n}'
  );
  fs.writeFileSync('src/CategoriesManager.tsx', code);
  console.log('Added bulkUpdateTransactionsByNames to imports');
}

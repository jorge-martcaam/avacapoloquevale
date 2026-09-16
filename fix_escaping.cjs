const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Replace \` with `
code = code.replace(/\\`/g, '`');

// Replace \$ with $
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Fixed escaping in CategoriesManager');

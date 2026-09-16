const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Change the condition to allow deleting predefined supercategories
code = code.replace(/\{!PREDEFINED_SUPERCATEGORIES\.includes\(sc\) && \(/, '{true && (');

// Change the condition to allow deleting predefined categories
code = code.replace(/\{\(!PREDEFINED_CATEGORIES\.includes\(cat\) \|\| customCategoriesMap\[cat\]\) && \(/, '{true && (');

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('CategoriesManager patched to allow deleting predefined categories');

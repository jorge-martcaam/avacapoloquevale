const fs = require('fs');

// Fix unused PREDEFINED_CATEGORIES in CategoriesManager
let cm = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');
cm = cm.replace(/PREDEFINED_CATEGORIES/g, '/* PREDEFINED_CATEGORIES */');
fs.writeFileSync('src/CategoriesManager.tsx', cm);

// Fix unused React in MassEditModal
let me = fs.readFileSync('src/MassEditModal.tsx', 'utf8');
me = me.replace(/import React, \{/g, 'import {');
fs.writeFileSync('src/MassEditModal.tsx', me);

console.log("Fixed unused vars");

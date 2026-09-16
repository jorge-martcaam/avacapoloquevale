const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

const oldHandleSave = `      await addCustomCategory(editName || editingCategory.name, editSuper);
      setCustomCategoriesMap(prev => ({...prev, [editName || editingCategory.name]: editSuper}));`;

const newHandleSave = `      if (editName !== editingCategory.name) {
        await removeCustomCategory(editingCategory.name);
        setCustomCategoriesMap(prev => {
          const newMap = {...prev};
          delete newMap[editingCategory.name];
          newMap[editName] = editSuper;
          return newMap;
        });
      } else {
        setCustomCategoriesMap(prev => ({...prev, [editName]: editSuper}));
      }
      await addCustomCategory(editName || editingCategory.name, editSuper);`;

code = code.replace(oldHandleSave, newHandleSave);

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Fixed handleSave in CategoriesManager');

const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

// Add arrayRemove to import
code = code.replace(/arrayUnion,/, 'arrayUnion,\n  arrayRemove,');

// Add removeCustomSuperCategory
const newFunc = `
export async function removeCustomSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await updateDoc(doc(db, path), { 
      customSuperCategories: arrayRemove(superCategory) 
    });
  } catch (error) {
    console.error("Error removing custom supercategory", error);
  }
}
`;

code += newFunc;
fs.writeFileSync('src/lib/firestore.ts', code);
console.log('Added removeCustomSuperCategory');

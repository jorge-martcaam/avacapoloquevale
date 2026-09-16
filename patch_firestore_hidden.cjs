const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

// Add hidden lists to profile update
const newFuncs = `
export async function hideCategory(category: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { 
      hiddenCategories: arrayUnion(category) 
    }, { merge: true });
  } catch (error) {
    console.error("Error hiding category", error);
  }
}

export async function hideSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { 
      hiddenSuperCategories: arrayUnion(superCategory) 
    }, { merge: true });
  } catch (error) {
    console.error("Error hiding supercategory", error);
  }
}
`;

code += newFuncs;
fs.writeFileSync('src/lib/firestore.ts', code);
console.log('Added hideCategory and hideSuperCategory');

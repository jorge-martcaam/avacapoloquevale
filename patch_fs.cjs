const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

const newFunctions = `
export async function addCustomCategory(category: string, superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { 
      customCategoriesMap: { [category]: superCategory } 
    }, { merge: true });
  } catch (error) {
    console.error("Error adding custom category", error);
  }
}

export async function addCustomSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { 
      customSuperCategories: arrayUnion(superCategory) 
    }, { merge: true });
  } catch (error) {
    console.error("Error adding custom supercategory", error);
  }
}

export async function removeCustomCategory(category: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.customCategoriesMap && data.customCategoriesMap[category]) {
      const updatedMap = { ...data.customCategoriesMap };
      delete updatedMap[category];
      await updateDoc(docRef, { customCategoriesMap: updatedMap });
    }
  } catch (error) {
    console.error("Error removing custom category", error);
  }
}
`;

code += newFunctions;
fs.writeFileSync('src/lib/firestore.ts', code);
console.log('Added custom category functions to firestore.ts');

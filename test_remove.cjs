const fs = require('fs');
const content = fs.readFileSync('src/lib/firestore.ts', 'utf-8');
const startIndex = content.indexOf('export async function migrateV2CategoriesAndSuperCategories() {');
if (startIndex !== -1) {
  const nextFunctionIndex = content.indexOf('export async function autoClassifyCurrentTransactions() {', startIndex);
  if (nextFunctionIndex !== -1) {
    const newContent = content.substring(0, startIndex) + content.substring(nextFunctionIndex);
    fs.writeFileSync('src/lib/firestore.ts', newContent);
    console.log('Removed successfully.');
  } else {
    console.log('Next function not found.');
  }
} else {
  console.log('Function not found.');
}

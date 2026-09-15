const fs = require('fs');
let code = fs.readFileSync('src/lib/firestore.ts', 'utf8');

code = code.replace(
  `export async function updateUserPayday(payday: number) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { payday }, { merge: true });
  } catch (error) {
    console.error("Error updating user payday", error);
  }
}`,
  `export async function updateUserPaydayRange(paydayStart: number, paydayEnd: number) {
  const user = auth.currentUser;
  if (!user) return;
  const path = \`users/\${user.uid}\`;
  try {
    await setDoc(doc(db, path), { paydayStart, paydayEnd }, { merge: true });
  } catch (error) {
    console.error("Error updating user payday", error);
  }
}`
);

fs.writeFileSync('src/lib/firestore.ts', code);

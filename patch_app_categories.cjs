const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert import at the top
if (!code.includes('import { CategoriesManager }')) {
  code = code.replace('import { Overview } from "./Overview";', 'import { Overview } from "./Overview";\nimport { CategoriesManager } from "./CategoriesManager";');
}

// Remove the inline function
const startIdx = code.indexOf('function CategoriesManager({');
const endIdx = code.indexOf('export default function App() {');
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
  fs.writeFileSync('src/App.tsx', code);
  console.log('CategoriesManager removed from App.tsx');
} else {
  console.log('Could not find boundaries');
}

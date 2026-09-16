const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Insert the missing state
const missingState = `  const [customCategoriesMap, setCustomCategoriesMap] = useState<Record<string, string>>({});
  const [customSuperCategories, setCustomSuperCategories] = useState<string[]>([]);
`;

code = code.replace(
  /  const \[tempPaydayEnd, setTempPaydayEnd\] = useState<number>\(31\);\n/,
  `  const [tempPaydayEnd, setTempPaydayEnd] = useState<number>(31);\n${missingState}`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed missing state in App.tsx');

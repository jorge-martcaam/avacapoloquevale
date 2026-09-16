const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add state
const stateInsert = `  const [userPaydayStart, setUserPaydayStart] = useState<number>(1);
  const [userPaydayEnd, setUserPaydayEnd] = useState<number>(31);
  const [tempPaydayStart, setTempPaydayStart] = useState<number>(1);
  const [tempPaydayEnd, setTempPaydayEnd] = useState<number>(31);
  const [customCategoriesMap, setCustomCategoriesMap] = useState<Record<string, string>>({});
  const [customSuperCategories, setCustomSuperCategories] = useState<string[]>([]);`;
code = code.replace(/  const \[userPaydayStart, setUserPaydayStart\] = useState<number>\(1\);\n  const \[userPaydayEnd, setUserPaydayEnd\] = useState<number>\(31\);\n  const \[tempPaydayStart, setTempPaydayStart\] = useState<number>\(1\);\n  const \[tempPaydayEnd, setTempPaydayEnd\] = useState<number>\(31\);/, stateInsert);

// Add to profile fetch
const profileInsert = `          if (profile && profile.paydayEnd) {
            setUserPaydayEnd(profile.paydayEnd);
            setTempPaydayEnd(profile.paydayEnd);
          }
          if (profile && profile.customCategoriesMap) {
            setCustomCategoriesMap(profile.customCategoriesMap);
          }
          if (profile && profile.customSuperCategories) {
            setCustomSuperCategories(profile.customSuperCategories);
          }`;
code = code.replace(/          if \(profile && profile\.paydayEnd\) \{\n            setUserPaydayEnd\(profile\.paydayEnd\);\n            setTempPaydayEnd\(profile\.paydayEnd\);\n          \}/, profileInsert);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx state updated');

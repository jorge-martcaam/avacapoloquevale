const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSelect = `{aspsps
              .filter((a) => a.country === "ES")
              .map((aspsp, i) => (
                <option key={i} value={aspsp.name}>
                  {aspsp.name}
                </option>
              ))}`;

const newSelect = `{aspsps
              .filter((a) => a.country === "ES")
              .sort((a, b) => a.name.localeCompare(b.name, 'gl'))
              .map((aspsp, i) => (
                <option key={i} value={aspsp.name}>
                  {aspsp.name}
                </option>
              ))}`;

code = code.replace(oldSelect, newSelect);

fs.writeFileSync('src/App.tsx', code);
console.log('Aspsps sorted');

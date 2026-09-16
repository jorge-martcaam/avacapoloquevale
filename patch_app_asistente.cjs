const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove import
code = code.replace(/import \{ InsightsManager \} from "\.\/InsightsManager";\n?/g, '');

// Remove tab button
const tabRegex = /<button\s+onClick=\{\(\) => setCurrentTab\("insights"\)\}.*?<\/button>/s;
code = code.replace(tabRegex, '');

// Remove tab content
const contentRegex = /\{currentTab === "insights" && \(\s*<div className="animate-fade-in">\s*<InsightsManager transactions=\{transactions\} \/>\s*<\/div>\s*\)\}/s;
code = code.replace(contentRegex, '');

fs.writeFileSync('src/App.tsx', code);
console.log('App patched.');

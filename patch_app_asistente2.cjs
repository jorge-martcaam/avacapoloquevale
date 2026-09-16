const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regexType = / \| "insights"/g;
code = code.replace(regexType, '');

const contentRegex = /\{currentTab === "insights" && \(\s*<div className="space-y-6">\s*<InsightsManager transactions=\{transactions\} \/>\s*<\/div>\s*\)\}/s;
code = code.replace(contentRegex, '');

fs.writeFileSync('src/App.tsx', code);
console.log('App patched.');

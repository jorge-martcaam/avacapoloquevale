const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

// 1. Add state to CashflowDashboard
const oldFuncStart = `function CashflowDashboard({ insights }: { insights: any }) {
  return (`;
const newFuncStart = `function CashflowDashboard({ insights }: { insights: any }) {
  const [selectedDetail, setSelectedDetail] = React.useState<{title: string, txs: Transaction[]} | null>(null);

  return (`;
code = code.replace(oldFuncStart, newFuncStart);

// 2. Replace .toFixed(0) calls that broke because of the object structure
code = code.replace(/insights\.incomeBreakdown\?\.nomina\.toFixed\(0\)/g, 'insights.incomeBreakdown?.nomina.total.toFixed(0)');
code = code.replace(/insights\.incomeBreakdown\?\.aluguer\.toFixed\(0\)/g, 'insights.incomeBreakdown?.aluguer.total.toFixed(0)');
code = code.replace(/insights\.incomeBreakdown\?\.outros\.toFixed\(0\)/g, 'insights.incomeBreakdown?.outros.total.toFixed(0)');

code = code.replace(/insights\.expenseBreakdown\?\.recorrentes\.toFixed\(0\)/g, 'insights.expenseBreakdown?.recorrentes.total.toFixed(0)');
code = code.replace(/insights\.expenseBreakdown\?\.supermercado\.toFixed\(0\)/g, 'insights.expenseBreakdown?.supermercado.total.toFixed(0)');
code = code.replace(/insights\.expenseBreakdown\?\.ocio\.toFixed\(0\)/g, 'insights.expenseBreakdown?.ocio.total.toFixed(0)');
// the formiga+outros needs special handling
code = code.replace(
  /\(\(insights\.expenseBreakdown\?\.formiga \|\| 0\) \+ \(insights\.expenseBreakdown\?\.outros \|\| 0\)\)\.toFixed\(0\)/g, 
  '((insights.expenseBreakdown?.formiga?.total || 0) + (insights.expenseBreakdown?.outros?.total || 0)).toFixed(0)'
);

// 3. Make rows clickable
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">💼 Nómina \/ Pensión<\/span>\s*<span className="font-bold shrink-0">\{insights\.incomeBreakdown\?\.nomina\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "💼 Nómina / Pensión", txs: insights.incomeBreakdown?.nomina?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">💼 Nómina / Pensión</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.nomina.total.toFixed(0)} €</span>
              </button>`
);
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">🏠 Aluguer \/ Hipoteca<\/span>\s*<span className="font-bold shrink-0">\{insights\.incomeBreakdown\?\.aluguer\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "🏠 Aluguer / Hipoteca", txs: insights.incomeBreakdown?.aluguer?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🏠 Aluguer / Hipoteca</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.aluguer.total.toFixed(0)} €</span>
              </button>`
);
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">📦 Outros<\/span>\s*<span className="font-bold shrink-0">\{insights\.incomeBreakdown\?\.outros\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "📦 Outros (Ingresos)", txs: insights.incomeBreakdown?.outros?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">📦 Outros</span>
                <span className="font-bold shrink-0">{insights.incomeBreakdown?.outros.total.toFixed(0)} €</span>
              </button>`
);

code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">🔄 Fixos \/ Recorrentes<\/span>\s*<span className="font-bold shrink-0">\{insights\.expenseBreakdown\?\.recorrentes\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "🔄 Fixos / Recorrentes", txs: insights.expenseBreakdown?.recorrentes?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🔄 Fixos / Recorrentes</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.recorrentes.total.toFixed(0)} €</span>
              </button>`
);
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">🛒 Supermercado<\/span>\s*<span className="font-bold shrink-0">\{insights\.expenseBreakdown\?\.supermercado\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "🛒 Supermercado", txs: insights.expenseBreakdown?.supermercado?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🛒 Supermercado</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.supermercado.total.toFixed(0)} €</span>
              </button>`
);
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">🍻 Ocio e Rest\.<\/span>\s*<span className="font-bold shrink-0">\{insights\.expenseBreakdown\?\.ocio\.total\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "🍻 Ocio e Rest.", txs: insights.expenseBreakdown?.ocio?.txs || [] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🍻 Ocio e Rest.</span>
                <span className="font-bold shrink-0">{insights.expenseBreakdown?.ocio.total.toFixed(0)} €</span>
              </button>`
);
code = code.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-2\.5 rounded-lg border border-slate-100">\s*<span className="truncate pr-2">🐜 Formiga \/ Outros<\/span>\s*<span className="font-bold shrink-0">\{\(\(insights\.expenseBreakdown\?\.formiga\?\.total \|\| 0\) \+ \(insights\.expenseBreakdown\?\.outros\?\.total \|\| 0\)\)\.toFixed\(0\)\} €<\/span>\s*<\/div>/g,
  `<button onClick={() => setSelectedDetail({ title: "🐜 Formiga / Outros", txs: [...(insights.expenseBreakdown?.formiga?.txs || []), ...(insights.expenseBreakdown?.outros?.txs || [])] })} className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer p-2.5 rounded-lg border border-slate-100">
                <span className="truncate pr-2">🐜 Formiga / Outros</span>
                <span className="font-bold shrink-0">{((insights.expenseBreakdown?.formiga?.total || 0) + (insights.expenseBreakdown?.outros?.total || 0)).toFixed(0)} €</span>
              </button>`
);


// 4. Append the modal to the end of CashflowDashboard
const oldEnd = `      </div>
    </div>
  );
}`;
const modalMarkup = `      </div>

      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl animate-fade-in relative">
            <button 
              onClick={() => setSelectedDetail(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 mb-6 pr-10">{selectedDetail.title}</h3>
            
            <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
              {selectedDetail.txs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Non hai movementos nesta categoría este mes.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-2 text-sm font-bold text-slate-500">Movemento</th>
                      <th className="py-3 px-2 text-sm font-bold text-slate-500">Categoría</th>
                      <th className="py-3 px-2 text-sm font-bold text-slate-500 text-right w-24">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.txs.sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                      <tr key={tx.transaction_id || tx.name+tx.date} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <div className="font-medium text-slate-900 text-sm truncate max-w-[200px]" title={tx.name}>{tx.name}</div>
                          <div className="text-xs text-slate-400 font-medium mt-0.5">{tx.date.split("-").reverse().join("/")}</div>
                        </td>
                        <td className="py-3 px-2">
                          {tx.superCategory && <div className="text-xs font-bold text-blue-600 mb-0.5">{tx.superCategory}</div>}
                          <div className="text-xs text-slate-500">{tx.category || "Sen categoría"}</div>
                        </td>
                        <td className={\`py-3 px-2 text-right font-black text-sm \${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}\`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;
code = code.replace(oldEnd, modalMarkup);

fs.writeFileSync('src/Overview.tsx', code);
console.log('CashflowDashboard updated with interactive rows and modal');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Día de cobro da nómina
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={tempPayday}
                    onChange={(e) => setTempPayday(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow text-slate-900"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Usarase este día como inicio de cada mes para calcular a túa radiografía (ex: do 28 ao 27).
                </p>`,
  `                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Días de cobro da nómina (rango)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={tempPaydayStart}
                    onChange={(e) => setTempPaydayStart(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow text-slate-900"
                    placeholder="Día de inicio"
                  />
                  <span className="text-slate-500">ao</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={tempPaydayEnd}
                    onChange={(e) => setTempPaydayEnd(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow text-slate-900"
                    placeholder="Día de fin"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Usarase este rango como período do mes para calcular a túa radiografía (ex: do 28 ao 31).
                </p>`
);

fs.writeFileSync('src/App.tsx', code);

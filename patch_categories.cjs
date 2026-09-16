const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetBlock = `const PREDEFINED_CATEGORIES = [
  "💼 Nómina / Pensión",
  "💸 Transferencias recibidas",
  "🔁 Devolucións",
  "➕ Outros ingresos",
  "🏠 Aluguer / Hipoteca",
  "🏘️ Comunidade",
  "💡 Subministracións (Luz, Gas, Auga)",
  "🌐 Internet e Teléfono",
  "🛡️ Seguros (Fogar, Vida)",
  "🔧 Mantemento e Compras do fogar",
  "🛒 Supermercado",
  "🥖 Pequeno comercio",
  "⛽ Combustible",
  "🚌 Transporte público",
  "🔧 Taller e Mantemento",
  "🅿️ Peaxes e Aparcadoiro",
  "💊 Farmacia",
  "⚕️ Saúde e Médicos",
  "🏋️ Deporte e Ximnasio",
  "💅 Estética e Peiteado",
  "🍽️ Restaurantes e Bares",
  "👕 Roupa e Complementos",
  "📱 Subscricións",
  "✈️ Viaxes e Aloxamento",
  "🎭 Cultura e Espectáculos",
  "🏦 Comisións bancarias",
  "🏛️ Impostos e Taxas",
  "📝 Multas ou Sancións",
  "🐷 Aforro",
  "📈 Investimentos",
  "💸 Bizum (Gastos)",
  "💳 Retirada de efectivo",
];

const PREDEFINED_SUPERCATEGORIES = [
  "📥 Ingresos",
  "🏠 Fogar e Vivenda",
  "🛒 Alimentación",
  "🚗 Transporte",
  "⚕️ Saúde e Coidado Persoal",
  "🎉 Ocio e Tempo Libre",
  "🏦 Obrigas e Gastos Financeiros",
  "📈 Aforro e Investimento",
];`;

const replacementBlock = `const PREDEFINED_CATEGORIES = [
  "Nómina / Pensión",
  "Transferencias recibidas",
  "Devolucións",
  "Aluguer / Hipoteca",
  "Comunidade",
  "Subministracións (Luz, Gas, Auga)",
  "Internet e Teléfono",
  "Seguros",
  "Mantemento e Compras do fogar",
  "Supermercado",
  "Pequeno comercio",
  "Combustible",
  "Transporte público",
  "Taller e Vehículo",
  "Peaxes e Aparcadoiro",
  "Farmacia",
  "Saúde e Médicos",
  "Deporte e Ximnasio",
  "Estética e Peiteado",
  "Restaurantes e Bares",
  "Roupa e Complementos",
  "Subscricións",
  "Viaxes e Aloxamento",
  "Cultura e Espectáculos",
  "Comisións bancarias",
  "Impostos e Taxas",
  "Multas ou Sancións",
  "Aforro",
  "Investimentos",
  "Bizum",
  "Retirada de efectivo",
  "Outros",
];

const PREDEFINED_SUPERCATEGORIES = [
  "Ingresos",
  "Fogar e Vivenda",
  "Alimentación",
  "Transporte",
  "Saúde e Coidado Persoal",
  "Ocio e Tempo Libre",
  "Obrigas e Gastos Financeiros",
  "Aforro e Investimento",
];`;

if (code.includes('const PREDEFINED_CATEGORIES = [')) {
  code = code.replace(targetBlock, replacementBlock);
  
  // also do string replacements for other places in App.tsx
  code = code.replace(/"📦 Outros"/g, '"Outros"');
  code = code.replace(/"💼 Nómina \/ Pensión"/g, '"Nómina / Pensión"');
  
  fs.writeFileSync('src/App.tsx', code);
  console.log('Successfully patched categories in App.tsx');
} else {
  console.error('Target block not found');
}

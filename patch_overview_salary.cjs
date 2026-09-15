const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

const targetBlock = `    if (userPaydayStart && userPaydayEnd) {
      const today = new Date();
      let customDate: Date;
      if (today.getDate() >= userPaydayStart) {
        customDate = new Date(today.getFullYear(), today.getMonth(), userPaydayStart);
      } else {
        customDate = new Date(today.getFullYear(), today.getMonth() - 1, userPaydayStart);
      }
      const formatDate = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
      cycleStartDateStr = formatDate(customDate);
    } else {
      const sortedByDate = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
      
      for (const t of sortedByDate) {
        const day = parseInt(t.date.substring(8, 10), 10);
        const isNomina = t.category === "💼 Nómina / Pensión" || 
                          t.name.toLowerCase().includes("nomina") || 
                          t.name.toLowerCase().includes("nómina");
        
        // Fallback: any large income around the 24th-31st is likely the salary
        const isLikelySalary = t.amount > 600 && day >= 24;
        
        if (t.amount > 0 && (isNomina || isLikelySalary)) {
          cycleStartDateStr = t.date;
          break;
        }
      }

      // Fallback if no salary found
      if (!cycleStartDateStr) {
        const today = new Date();
        let fallbackDate: Date;
        if (today.getDate() >= 28) {
          fallbackDate = new Date(today.getFullYear(), today.getMonth(), 28);
        } else {
          fallbackDate = new Date(today.getFullYear(), today.getMonth() - 1, 28);
        }
        const formatDate = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
        cycleStartDateStr = formatDate(fallbackDate);
      }
    }`;

const replacementBlock = `    const sortedByDate = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    const startWindow = userPaydayStart || 24;
    const endWindow = userPaydayEnd || 31;
    
    for (const t of sortedByDate) {
      const day = parseInt(t.date.substring(8, 10), 10);
      const isNomina = t.category === "💼 Nómina / Pensión" || 
                        t.name.toLowerCase().includes("nomina") || 
                        t.name.toLowerCase().includes("nómina");
      
      let inWindow = false;
      if (startWindow <= endWindow) {
         inWindow = day >= startWindow && day <= endWindow;
      } else {
         inWindow = day >= startWindow || day <= endWindow;
      }
      
      // Fallback: any large income around the user's configured payday window
      const isLikelySalary = t.amount > 600 && inWindow;
      
      if (t.amount > 0 && (isNomina || isLikelySalary)) {
        cycleStartDateStr = t.date;
        break;
      }
    }

    // Fallback if no salary found at all
    if (!cycleStartDateStr) {
      const today = new Date();
      let fallbackDate: Date;
      const fallbackDay = userPaydayStart || 28;
      if (today.getDate() >= fallbackDay) {
        fallbackDate = new Date(today.getFullYear(), today.getMonth(), fallbackDay);
      } else {
        fallbackDate = new Date(today.getFullYear(), today.getMonth() - 1, fallbackDay);
      }
      const formatDate = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
      cycleStartDateStr = formatDate(fallbackDate);
    }`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementBlock);
  fs.writeFileSync('src/Overview.tsx', code);
  console.log('Successfully patched');
} else {
  console.error('Target block not found');
}

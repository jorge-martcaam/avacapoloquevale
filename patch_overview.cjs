const fs = require('fs');
let code = fs.readFileSync('src/Overview.tsx', 'utf8');

code = code.replace(
  `    if (userPayday) {
      const today = new Date();
      let customDate: Date;
      if (today.getDate() >= userPayday) {
        customDate = new Date(today.getFullYear(), today.getMonth(), userPayday);
      } else {
        customDate = new Date(today.getFullYear(), today.getMonth() - 1, userPayday);
      }
      const formatDate = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
      cycleStartDateStr = formatDate(customDate);
    } else {`,
  `    if (userPaydayStart && userPaydayEnd) {
      const today = new Date();
      let customDate: Date;
      if (today.getDate() >= userPaydayStart) {
        customDate = new Date(today.getFullYear(), today.getMonth(), userPaydayStart);
      } else {
        customDate = new Date(today.getFullYear(), today.getMonth() - 1, userPaydayStart);
      }
      const formatDate = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
      cycleStartDateStr = formatDate(customDate);
    } else {`
);

code = code.replace(
  `  }, [transactions, recurringThreshold, subscriptionMonthsBack, antExpenseMonthsBack, antExpenseThreshold, userPayday]);`,
  `  }, [transactions, recurringThreshold, subscriptionMonthsBack, antExpenseMonthsBack, antExpenseThreshold, userPaydayStart, userPaydayEnd]);`
);

fs.writeFileSync('src/Overview.tsx', code);

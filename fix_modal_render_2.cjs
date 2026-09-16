const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Remove any existing MassEditModal blocks
code = code.replace(/      \{showMassEditModal && \([\s\S]*?\}\)\}\n/g, '');
code = code.replace(/      \{showMassEditModal && \([\s\S]*?\}\)\}\n/g, ''); // just in case

// Find function TxRow and insert before it
const parts = code.split('function TxRow({');

if (parts.length === 2) {
  let before = parts[0];
  // Replace the end of ClasificarView (which should be `    </div>\n  );\n}\n\n`)
  before = before.replace(
    /    <\/div>\n  \);\n\}\n\n?$/,
    `      {showMassEditModal && (
        <MassEditModal 
          transactions={transactions} 
          availableCategories={availableCategories}
          availableSuperCategories={availableSuperCategories}
          onClose={() => setShowMassEditModal(false)}
          onSuccess={async () => {
            const reloadedTxs = await getTransactionsFromFirestore();
            setTransactions(reloadedTxs);
          }}
        />
      )}
    </div>
  );
}

`
  );
  
  code = before + 'function TxRow({' + parts[1];
  fs.writeFileSync('src/CategoriesManager.tsx', code);
  console.log('Fixed MassEditModal render position again');
} else {
  console.log('Could not split at function TxRow');
}

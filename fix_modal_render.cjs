const fs = require('fs');
let code = fs.readFileSync('src/CategoriesManager.tsx', 'utf8');

// Remove from CategoriesManager
code = code.replace(
  /      \{showMassEditModal && \([\s\S]*?\}\)\}\n    <\/div>\n  \);\n\}\n/,
  '    </div>\n  );\n}\n'
);

// Append to ClasificarView
const clasificarEndRegex = /    <\/div>\n  \);\n\}\n$/;
if (code.match(clasificarEndRegex)) {
  code = code.replace(
    clasificarEndRegex,
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
} else {
    console.log("Could not find ClasificarView end");
}

fs.writeFileSync('src/CategoriesManager.tsx', code);
console.log('Fixed MassEditModal render position');

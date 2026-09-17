import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const logDebug = (title: string, data?: any) => {
  try {
    const timestamp = new Date().toISOString();
    const formatted = data !== undefined 
      ? (typeof data === "object" ? JSON.stringify(data, null, 2) : String(data))
      : "";
    const line = `[${timestamp}] ${title}\n${formatted}\n---\n`;
    fs.appendFileSync("/tmp/enablebanking_debug.log", line);
  } catch (err) {
    console.error("Failed to write to debug log:", err);
  }
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));
  app.use(cors());

  // --- Enable Banking Setup & Mock ---
  // https://enablebanking.com/docs/api/
  
  const generateEnableBankingJWT = () => {
    const kid = process.env.ENABLEBANKING_KID;
    const privateKey = process.env.ENABLEBANKING_PRIVATE_KEY;
    if (!kid || !privateKey) {
      throw new Error('Missing EnableBanking credentials');
    }
    
    let formattedPrivateKey = privateKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');
    if (!formattedPrivateKey.includes('\n')) {
      const match = formattedPrivateKey.match(/(-----BEGIN [A-Z ]+-----)(.*?)(-----END [A-Z ]+-----)/);
      if (match) {
        const header = match[1];
        const body = match[2].replace(/\s+/g, '');
        const footer = match[3];
        const chunkedBody = body.match(/.{1,64}/g)?.join('\n') || body;
        formattedPrivateKey = `${header}\n${chunkedBody}\n${footer}`;
      }
    }

    const payload = {
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const token = jwt.sign(payload, formattedPrivateKey, {
      algorithm: 'RS256',
      keyid: kid,
      header: { typ: 'JWT' }
    });

    return token;
  };

  app.get('/api/enablebanking/aspsps', async (req, res) => {
    try {
      const token = generateEnableBankingJWT();
      const response = await fetch('https://api.enablebanking.com/aspsps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch ASPSPs', details: error.message });
    }
  });

  app.get('/api/enablebanking/debug_logs', (req, res) => {
    try {
      if (fs.existsSync('/tmp/enablebanking_debug.log')) {
        const content = fs.readFileSync('/tmp/enablebanking_debug.log', 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(content);
      } else {
        res.send('No debug logs yet.');
      }
    } catch (err: any) {
      res.status(500).send('Error reading debug logs: ' + err.message);
    }
  });

  app.post('/api/enablebanking/start_auth', async (req, res) => {
    try {
      const token = generateEnableBankingJWT();
      const { redirect_uri, aspsp, psu_type, auth_method } = req.body;
      
      const startAuthBody: any = {
        access: {
          valid_until: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
          balances: true,
          transactions: true
        },
        aspsp: aspsp || { name: "Banco de Sabadell", country: "ES" },
        psu_type: psu_type || "personal",
        state: "some-random-state-12345",
        redirect_url: redirect_uri || `${req.protocol}://${req.get('host')}/api/enablebanking/callback`
      };

      if (auth_method) {
        startAuthBody.auth_method = auth_method;
      }

      logDebug('EnableBanking /auth request body:', startAuthBody);

      const response = await fetch('https://api.enablebanking.com/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(startAuthBody)
      });

      const data = await response.json();
      logDebug(`EnableBanking /auth response status: ${response.status}`, data);

      if (!response.ok) {
        return res.status(response.status).json({
          error_code: data.error || 'API_ERROR',
          error_message: data.message || JSON.stringify(data)
        });
      }

      res.json({ auth_url: data.url });
    } catch (error: any) {
      logDebug('Error starting auth:', error.message);
      console.error('Error starting auth:', error);
      res.status(500).json({ error: 'Failed to start auth', details: error.message });
    }
  });

  app.get('/api/enablebanking/callback', (req, res) => {
    const { code, error } = req.query;
    logDebug('EnableBanking /callback query:', { code, error });
    if (error) {
      return res.send(`
        <html><body><script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'ENABLEBANKING_AUTH_ERROR', error: '${error}' }, '*');
            window.close();
          }
        </script>
        <p>There was an error: ${error}. You can close this window.</p>
        </body></html>
      `);
    }

    res.send(`
      <html><body><script>
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'ENABLEBANKING_AUTH_SUCCESS', code: '${code}' }, '*');
          window.close();
        }
      </script>
      <p>Authentication successful. You can close this window.</p>
      </body></html>
    `);
  });

  app.post('/api/enablebanking/accounts', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
      }

      logDebug('EnableBanking /accounts requested with code:', code);
      const token = generateEnableBankingJWT();

      const sessionResponse = await fetch('https://api.enablebanking.com/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const sessionData: any = await sessionResponse.json();
      logDebug(`EnableBanking /sessions raw response (status ${sessionResponse.status}):`, sessionData);

      if (!sessionResponse.ok) {
        return res.status(sessionResponse.status).json({
          error: 'Failed to create session',
          details: sessionData
        });
      }

      let rawAccounts: any[] = sessionData.accounts || [];
      let getSessionData: any = null;

      // If accounts array is empty, check if session has accounts_data or can be fetched via GET /sessions/:id
      if (rawAccounts.length === 0 && sessionData.session_id) {
        try {
          const getSessionRes = await fetch(`https://api.enablebanking.com/sessions/${sessionData.session_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (getSessionRes.ok) {
            getSessionData = await getSessionRes.json();
            logDebug('EnableBanking GET /sessions/:id response:', getSessionData);
            if (Array.isArray(getSessionData.accounts) && getSessionData.accounts.length > 0) {
              rawAccounts = getSessionData.accounts;
            } else if (Array.isArray(getSessionData.accounts_data) && getSessionData.accounts_data.length > 0) {
              rawAccounts = getSessionData.accounts_data;
            }
          }
        } catch (sessErr) {
          logDebug('Error fetching session details:', sessErr);
        }
      }

      if (rawAccounts.length === 0 && Array.isArray(sessionData.accounts_data) && sessionData.accounts_data.length > 0) {
        rawAccounts = sessionData.accounts_data;
      }

      // Concurrently resolve details and balances for each account
      const accounts = await Promise.all(
        rawAccounts.map(async (accItem: any) => {
          const accountUid = typeof accItem === 'string' ? accItem : (accItem.uid || accItem.id);
          let details: any = {};
          let balances: any[] = [];

          if (accountUid) {
            try {
              const [detailsRes, balancesRes] = await Promise.all([
                fetch(`https://api.enablebanking.com/accounts/${accountUid}/details`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`https://api.enablebanking.com/accounts/${accountUid}/balances`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
              ]);

              if (detailsRes.ok) {
                details = await detailsRes.json();
              } else {
                logDebug(`Could not get details for account ${accountUid}:`, detailsRes.status);
              }

              if (balancesRes.ok) {
                const balJson: any = await balancesRes.json();
                balances = balJson.balances || [];
              } else {
                logDebug(`Could not get balances for account ${accountUid}:`, balancesRes.status);
              }
            } catch (fetchErr: any) {
              logDebug(`Error resolving details for account ${accountUid}:`, fetchErr.message);
            }
          }

          const baseObj = typeof accItem === 'object' ? accItem : {};
          return {
            ...baseObj,
            ...details,
            uid: accountUid || details.uid || baseObj.uid,
            id: accountUid || details.uid || baseObj.uid,
            balances: balances.length > 0 ? balances : (baseObj.balances || details.balances || [])
          };
        })
      );

      logDebug('Resolved accounts to return (count: ' + accounts.length + '):', accounts);
      res.json({ 
        accounts,
        debug: {
          session_id: sessionData.session_id,
          status: getSessionData?.status || sessionData.status || "AUTHORIZED",
          sessionData,
          getSessionData,
          rawAccountsCount: rawAccounts.length
        }
      });
    } catch (error: any) {
      logDebug('Internal server error fetching accounts:', error.message);
      console.error('Internal server error fetching accounts:', error);
      res.status(500).json({ error: 'Internal server error fetching accounts', details: error.message });
    }
  });

  app.post('/api/enablebanking/transactions', async (req, res) => {
    try {
      const { account_ids, date_from } = req.body;
      if (!account_ids || !Array.isArray(account_ids)) {
        return res.status(400).json({ error: 'account_ids must be an array' });
      }

      const token = generateEnableBankingJWT();
      const pastDate = date_from || new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let parsedTransactions: any[] = [];

      for (const accountId of account_ids) {
        let continuationKey: string | undefined = undefined;
        
        do {
          const queryParams = new URLSearchParams({
             strategy: 'longest',
             date_from: pastDate
          });
          if (continuationKey) {
             queryParams.append('continuation_key', continuationKey);
          }
          const txUrl = `https://api.enablebanking.com/accounts/${accountId}/transactions?${queryParams.toString()}`;

          const txResponse = await fetch(txUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Psu-Ip-Address': req.ip || '192.168.0.1',
              'Psu-User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
            }
          });

          const txData = await txResponse.json();
          if (!txResponse.ok) {
            console.error(`Failed to fetch transactions for account ${accountId}:`, txData);
            break; // Skip to next account on failure
          }

          if (txData && txData.transactions) {
             const batchTxs = txData.transactions.map((tx: any) => {
               const nameMatches = [
                 tx.creditor?.name,
                 tx.debtor?.name,
                 tx.creditor_name,
                 tx.debtor_name,
                 tx.note
               ].filter(Boolean);
               const party = nameMatches.length > 0 ? nameMatches[0] : null;

               const infoMatches = [
                 Array.isArray(tx.remittance_information) ? tx.remittance_information.join(' ') : tx.remittance_information,
                 tx.remittance_information_unstructured,
                 tx.additional_information,
                 tx.reference_number
               ].filter(Boolean);
               const info = infoMatches.length > 0 ? String(infoMatches[0]) : null;

               const counterparty = party;

               const counterpartyIban = tx.creditor_account?.iban || tx.debtor_account?.iban || undefined;

               let finalName = 'Movemento';
               if (party && info) {
                 finalName = `${party} - ${info}`;
               } else if (party) {
                 finalName = party;
               } else if (info) {
                 finalName = info;
               }

               if (finalName === 'Movemento') {
                  const stringVals = Object.keys(tx).filter(k => typeof tx[k] === 'string' && k !== 'transaction_id' && k !== 'entry_reference' && !k.includes('date')).map(k => tx[k]);
                  if (stringVals.length > 0) {
                     finalName = stringVals.join(' - ');
                  }
               }
               
               if (finalName === 'Movemento') {
                 console.log("Tx with no clear name properties:", JSON.stringify(tx));
               }

               const lsName = finalName.toLowerCase();
               let category = '📦 Outros';
               let mccDesc: string | undefined;
               const mcc = tx.merchant_category_code;
               
               // First check MCC
               if (mcc) {
                 const genericMapped: Record<string, string> = {
                   '5411': '🛒 Supermercados', // Supermercados / Tendas de alimentación
                   '5812': '🍽️ Restaurantes',
                   '5814': '🍽️ Restaurantes', // Comida rápida
                   '5541': '🚗 Transporte e Gasolina', // Gasolineiras
                   '5542': '🚗 Transporte e Gasolina', // Gasolineiras automatizadas
                   '4111': '🚗 Transporte e Gasolina', // Transporte / Trens
                   '4121': '🚗 Transporte e Gasolina', // Taxis / Vehículos con condutor
                   '4131': '🚗 Transporte e Gasolina', // Autobuses
                   '4511': '✈️ Viaxes', // Aeroliñas
                   '4722': '✈️ Viaxes', // Axencias de viaxes
                   '5912': '💊 Saúde e Farmacia',
                   '5691': '🛍️ Compras e Roupa',
                   '5621': '🛍️ Compras e Roupa',
                   '5651': '🛍️ Compras e Roupa',
                   '5732': '🛍️ Compras e Roupa', // Electrónica
                   '5251': '🛍️ Compras e Roupa', // Ferreterías
                   '4900': '💡 Facturas', // Subministracións eléctricas / auga
                   '4814': '💡 Facturas', // Servizos de telecomunicacións
                   '6300': '💡 Facturas', // Seguros
                   '8011': '💊 Saúde e Farmacia', // Médicos
                   '8062': '💊 Saúde e Farmacia', // Hospitais
                   '8211': '🎓 Educación',
                   '8299': '🎓 Educación',
                   '7999': '🍽️ Restaurantes' // Servizos recreativos
                 };
                 mccDesc = tx.merchant_category_code; // We'll keep the numerical MCC or expand it if needed, but genericMapped gives us the category directly
                 
                 if (genericMapped[mcc]) {
                    category = genericMapped[mcc];
                 }
               }
               
               // If category is still "Outros", try string matching
               if (category === '📦 Outros') {
                 if (lsName.includes('mercadona') || lsName.includes('gadis') || lsName.includes('froiz') || lsName.includes('eroski') || lsName.includes('carrefour') || lsName.includes('alcampo') || lsName.includes('dia') || lsName.includes('supermercado')) {
                   category = '🛒 Supermercados';
                 } else if (lsName.includes('uber') || lsName.includes('cabify') || lsName.includes('renfe') || lsName.includes('alsa') || lsName.includes('gasolinera') || lsName.includes('repsol') || lsName.includes('cepsa')) {
                   category = '🚗 Transporte e Gasolina';
                 } else if (lsName.includes('netflix') || lsName.includes('spotify') || lsName.includes('amazon prime') || lsName.includes('hbo') || lsName.includes('disney')) {
                   category = '📱 Subscricións';
                 } else if (lsName.includes('iberdrola') || lsName.includes('endesa') || lsName.includes('naturgy') || lsName.includes('vodafone') || lsName.includes('movistar') || lsName.includes('orange') || lsName.includes('r cable')) {
                   category = '💡 Facturas';
                 } else if (lsName.includes('amazon') || lsName.includes('zara') || lsName.includes('pull and bear') || lsName.includes('bershka')) {
                   category = '🛍️ Compras e Roupa';
                 } else if (lsName.includes('bizum')) {
                   category = '💸 Bizum';
                 } else if (lsName.includes('nómina') || lsName.includes('nomina') || lsName.includes('ingreso') || lsName.includes('transferencia a favor')) {
                   category = '💰 Ingresos';
                 } else if (lsName.includes('farmacia') || lsName.includes('hospital')) {
                   category = '💊 Saúde e Farmacia';
                 } else if (lsName.includes('vueling') || lsName.includes('ryanair') || lsName.includes('iberia') || lsName.includes('hotel') || lsName.includes('booking')) {
                   category = '✈️ Viaxes';
                 } else if (lsName.includes('universidade') || lsName.includes('colexio') || lsName.includes('academia')) {
                   category = '🎓 Educación';
                 }
               }

               return {
                 transaction_id: tx.entry_reference || tx.transaction_id || Math.random().toString(),
                 name: finalName,
                 amount: (tx.credit_debit_indicator === 'DBIT' ? -1 : 1) * Number(tx.transaction_amount?.amount || 0),
                 date: tx.value_date || tx.booking_date || new Date().toISOString(),
                 bookingDate: tx.booking_date,
                 valueDate: tx.value_date,
                 accountId: accountId, // Keep track of the account
                 category: category,
                 counterparty: counterparty,
                 counterpartyIban: counterpartyIban,
                 mcc: mcc,
                 mccDescription: mccDesc
               };
             });
             parsedTransactions = parsedTransactions.concat(batchTxs);
          }
          
          continuationKey = txData.continuation_key;
        } while (continuationKey);
      }

      res.json({ transactions: parsedTransactions });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error fetching transactions' });
    }
  });

  app.post('/api/ocr-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Falta a imaxe (imageBase64)' });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
               data: imageBase64,
               mimeType: mimeType || "image/jpeg"
            }
          },
          "Extract the information from this payment receipt. Follow the requested JSON schema closely. Identify the merchant name, the full transaction total amount, the date, and a list of the purchased items with their individual prices if available."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING, description: "The name of the store or merchant" },
              date: { type: Type.STRING, description: "Date of the receipt in YYYY-MM-DD format if possible, otherwise string" },
              totalAmount: { type: Type.NUMBER, description: "Total amount paid. Must be a positive number." },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER }
                  }
                }
              }
            },
            required: ["merchant", "totalAmount"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "{}";
      const receiptData = JSON.parse(jsonStr);
      res.json(receiptData);
    } catch (error: any) {
      console.error("Error in OCR:", error);
      res.status(500).json({ error: 'Erro analizando o ticket', details: error.message });
    }
  });

  // --- Vite / Frontend Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

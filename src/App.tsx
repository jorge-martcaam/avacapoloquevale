import { useState, useEffect, useRef, useMemo } from "react";
import {
  Wallet,
  Landmark,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronDown,
  Calendar,
  Search,
  Bell,
  Settings,
} from "lucide-react";
import { auth, logout } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  saveTransactionsToFirestore,
  getTransactionsFromFirestore,
  createUserProfile, getUserProfile, updateUserPaydayRange,
  deleteAllUserTransactions,
  Transaction,
  saveAccountsToFirestore,
  getAccountsFromFirestore,
  AccountBalance,
  updateTransactionCategory,
  updateTransactionSuperCategory,
  updateTransactionsByCategoryAndName,
  updateTransactionsBySuperCategoryAndName,
  renameCategory,
  assignSuperCategory,
  learnCategory,
  bulkUpdateTransactionsByNames,
  deleteAllLearnedCategories,
  resetAllTransactionCategories,
  autoClassifyCurrentTransactions,
  updateTransactionReceipt,
  normalizeName,
} from "./lib/firestore";
import AuthScreen from "./components/AuthScreen";
import { Overview } from "./Overview";

import { InsightsManager } from "./InsightsManager";

const PREDEFINED_CATEGORIES = [
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
];

export const getBankNameFromIBAN = (iban: string) => {
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();
  if (cleanIban.startsWith("ES") && cleanIban.length >= 8) {
    const entityCode = cleanIban.substring(4, 8);
    const espBanks: Record<string, string> = {
      "2080": "Abanca",
      "0049": "Santander",
      "0182": "BBVA",
      "2100": "CaixaBank",
      "0081": "Sabadell",
      "0128": "Bankinter",
      "2085": "Ibercaja",
      "2095": "Kutxabank",
      "2103": "Unicaja",
      "0239": "EVO Banco",
      "1465": "ING Banco",
      "0019": "Deutsche Bank",
    };
    return espBanks[entityCode] || "Banco";
  }
  return "Conta";
};

export const getBankNameForTx = (tx: any, accountBalances: any[]) => {
  let accId = tx.accountId || tx.account_id;
  let bankName = "Conta";
  if (accId) {
    const balanceInfo = accountBalances.find((a) => a.accountId === accId);
    if (!balanceInfo) return bankName;
    if (balanceInfo.bankName && balanceInfo.bankName.trim() !== "") {
      return balanceInfo.bankName;
    }
    const candidates = [
      accId as string,
      balanceInfo?.name,
      balanceInfo?.accountId,
    ].filter(Boolean) as string[];
    const validAccounts = candidates.filter((val) => {
      const cleaned = val.replace(/\s/g, "");
      return cleaned.length >= 15 && !cleaned.includes("-");
    });

    if (validAccounts.length > 0) {
      bankName = getBankNameFromIBAN(validAccounts[0]);
    } else {
      bankName = balanceInfo.name || bankName;
    }
  }
  return bankName;
};

export const getUniqueAccountBalances = (accountBalances: any[]) => {
  const uniqueAccountsMap = new Map<string, any>();
  for (const acc of accountBalances) {
    const key = acc.iban && acc.iban.length > 5 ? acc.iban : acc.accountId;
    if (
      !uniqueAccountsMap.has(key) ||
      (!uniqueAccountsMap.get(key).bankName && acc.bankName)
    ) {
      uniqueAccountsMap.set(key, acc);
    }
  }
  return Array.from(uniqueAccountsMap.values());
};

function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Política de Privacidade
      </h1>
      <p className="text-slate-500">
        Data de entrada en vigor: {new Date().toLocaleDateString("gl-ES")}
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        1. Información que recompilamos
      </h2>
      <p className="text-slate-600">
        A nosa aplicación recompila información proporcionada por vostede,
        incluíndo o seu enderezo de correo electrónico durante o proceso de
        rexistro, e os datos financeiros importados das súas entidades bancarias
        a través da nosa integración segura con provedores de servizos bancarios
        abertos.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        2. Uso da información
      </h2>
      <p className="text-slate-600">
        A información recompilada utilízase unicamente para ofrecerlle unha
        visión clara e integrada das súas finanzas e movementos bancarios. Os
        seus datos almacénanse de forma segura mediante tecnoloxías de Firebase.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        3. Compartición de datos
      </h2>
      <p className="text-slate-600">
        Non vendemos nin alugamos a súa información persoal. Esta pode ser
        compartida exclusivamente cos nosos provedores de infraestrutura e
        servizos estritamente necesarios para o mantemento e o funcionamento do
        servizo.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        4. Os seus dereitos
      </h2>
      <p className="text-slate-600">
        Vostede ten o dereito de acceder, modificar e eliminar os seus datos
        persoais en calquera momento, así como de revogar o acceso aos seus
        datos bancarios.
      </p>

      <button
        onClick={() => (window.location.href = "/")}
        className="mt-8 px-6 py-3 bg-slate-100 font-medium rounded-xl hover:bg-slate-200 transition-colors text-slate-800"
      >
        Volver ao inicio
      </button>
    </div>
  );
}

function TermsOfService() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Termos de Uso
      </h1>
      <p className="text-slate-500">
        Data de entrada en vigor: {new Date().toLocaleDateString("gl-ES")}
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        1. Aceptación dos termos
      </h2>
      <p className="text-slate-600">
        Ao acceder e utilizar a nosa aplicación "A vaca polo que vale", vostede
        acepta estar suxeito a estes termos de uso.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        2. Descrición do servizo
      </h2>
      <p className="text-slate-600">
        A aplicación proporciona unha ferramenta para a visualización de
        movementos bancarios. Non ofrecemos asesoramento financeiro nin
        recomendacións de investimento.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        3. Responsabilidades do usuario
      </h2>
      <p className="text-slate-600">
        O usuario é responsable de manter a seguridade da súa conta e de
        calquera actividade que ocorra baixo a mesma. Asegúrese de manter as
        súas credenciais seguras.
      </p>

      <h2 className="text-xl font-bold mt-6 text-slate-800">
        4. Limitación de responsabilidade
      </h2>
      <p className="text-slate-600">
        A nosa aplicación e responsabilidade principal están limitadas á
        visualización e agregación de datos proporcionados a través das APIs
        oficiais. Non nos facemos responsables das perdas derivadas do uso da
        información da aplicación.
      </p>

      <button
        onClick={() => (window.location.href = "/")}
        className="mt-8 px-6 py-3 bg-slate-100 font-medium rounded-xl hover:bg-slate-200 transition-colors text-slate-800"
      >
        Volver ao inicio
      </button>
    </div>
  );
}

function EnableBankingConnectButton({
  onTransactionsFetched,
  onAccountsFetched,
  loading,
  setLoadingTransactions,
  existingTransactions,
}: {
  onTransactionsFetched: (txs: Transaction[]) => void;
  onAccountsFetched: (accs: AccountBalance[]) => void;
  loading: boolean;
  setLoadingTransactions: (b: boolean) => void;
  existingTransactions: Transaction[];
}) {
  const [aspsps, setAspsps] = useState<any[]>([]);
  const [selectedAspsp, setSelectedAspsp] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    if (existingTransactions && existingTransactions.length > 0) {
      const latestDate = existingTransactions.reduce((latest, tx) => {
        const txDate = new Date(tx.date);
        return txDate > latest ? txDate : latest;
      }, new Date(0));
      // Restamos 3 días por seguridade para non perder movementos por diferenzas horarias ou asentamentos tardíos
      latestDate.setDate(latestDate.getDate() - 3);
      return latestDate.toISOString().split("T")[0];
    }
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });

  const startDateRef = useRef(startDate);
  useEffect(() => {
    startDateRef.current = startDate;
  }, [startDate]);

  useEffect(() => {
    const fetchAspsps = async () => {
      try {
        const response = await fetch("/api/enablebanking/aspsps");
        const data = await response.json();
        if (response.ok && data.aspsps) {
          setAspsps(data.aspsps);
        }
      } catch (error) {
        console.error("Error fetching ASPSPs", error);
      }
    };
    fetchAspsps();
  }, []);

  const handleStartAuth = async (aspspObj: any) => {
    try {
      setLoadingTransactions(true);
      setErrorMsg(null);
      const redirect_uri =
        window.location.origin + "/api/enablebanking/callback";
      const response = await fetch("/api/enablebanking/start_auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uri,
          aspsp: aspspObj,
          valid_from: startDate,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.error_code === "MISSING_CREDENTIALS") {
          setErrorMsg(
            "É necesario configurar as túas credenciais de Enable Banking nos segredos de entorno.",
          );
        } else {
          setErrorMsg(
            `Erro de Enable Banking: ${data.error_message || data.error}`,
          );
        }
        setLoadingTransactions(false);
        return;
      }

      // Open auth url
      window.open(data.auth_url, "oauth_popup", "width=500,height=600");
    } catch (error) {
      console.error("Error fetching auth url:", error);
      setErrorMsg("Produciuse un erro ao conectarse co servidor.");
      setLoadingTransactions(false);
    }
  };

  const handleImportTransactions = async () => {
    setLoadingTransactions(true);
    setErrorMsg(null);

    fetch("/api/enablebanking/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_ids: selectedAccounts,
        date_from: startDateRef.current,
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(async ({ ok, data }) => {
        if (!ok) {
          setLoadingTransactions(false);
          setErrorMsg(
            data.error_message ||
              data.error ||
              "Erro ao descargar as transaccións",
          );
        } else {
          try {
            const txs = data.transactions || [];

            // Deduplicate: Solo insertar movementos novos que non existan xa
            const existingIds = new Set(
              existingTransactions.map((t) => t.transaction_id),
            );
            const newTxs = txs.filter(
              (t: any) => !existingIds.has(t.transaction_id),
            );

            if (newTxs.length > 0) {
              await saveTransactionsToFirestore(newTxs);
            }

            // Build and save AccountBalance objects
            const selectedAccountsInfo = accounts
              .filter((a: any) => {
                const id = a.uid || a.account_id?.iban || a.id;
                return selectedAccounts.includes(id);
              })
              .map((acc: any) => {
                const id = acc.uid || acc.account_id?.iban || acc.id;
                const name =
                  acc.name || acc.product || acc.account_id?.iban || id;
                let balNum = 0;
                let curr = acc.currency || "EUR";
                if (acc.balances && acc.balances.length > 0) {
                  const bal =
                    acc.balances[0].balanceAmount ||
                    acc.balances[0].amount ||
                    {};
                  if (bal.amount !== undefined) {
                    balNum = Number(bal.amount);
                    curr = bal.currency || curr;
                  } else if (
                    acc.balances[0] !== undefined &&
                    typeof acc.balances[0] === "number"
                  ) {
                    balNum = Number(acc.balances[0]);
                  }
                }
                let iban = "";
                if (acc.account_id?.iban) {
                  iban = acc.account_id.iban;
                } else if (
                  acc.account_id &&
                  typeof acc.account_id === "string" &&
                  acc.account_id.length > 15
                ) {
                  iban = acc.account_id;
                } else {
                  const idStr = String(id);
                  if (idStr.length > 15 && !idStr.includes("-")) {
                    iban = idStr;
                  }
                }

                return {
                  accountId: id,
                  name: name,
                  balance: balNum,
                  currency: curr,
                  iban: iban,
                  bankName: selectedAspsp || "",
                };
              });

            if (selectedAccountsInfo.length > 0) {
              await saveAccountsToFirestore(selectedAccountsInfo);
              const allAccs = await getAccountsFromFirestore();
              onAccountsFetched(allAccs);
            }

            const allTxs = await getTransactionsFromFirestore();
            onTransactionsFetched(allTxs);
            setStep(1);
          } catch (err) {
            console.error("Error saving transactions", err);
            setErrorMsg("Erro gardando as transaccións");
          } finally {
            setLoadingTransactions(false);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadingTransactions(false);
        setErrorMsg("Fallo de conexión ao descargar as transaccións");
      });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow messages from same origin and the run.app domains
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "ENABLEBANKING_AUTH_SUCCESS") {
        const code = event.data.code;
        setLoadingTransactions(true);
        setErrorMsg(null);

        fetch("/api/enablebanking/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })
          .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
          .then(async ({ ok, data }) => {
            if (!ok) {
              setLoadingTransactions(false);
              setErrorMsg(
                data.error_message ||
                  data.error ||
                  "Erro ao descargar as contas",
              );
            } else {
              try {
                const accs = data.accounts || [];
                if (accs.length > 0) {
                  setAccounts(accs);
                  setSelectedAccounts(
                    accs.map((a: any) => a.uid || a.account_id || a.id),
                  );
                  setStep(2);
                } else {
                  setErrorMsg("Non se atoparon contas.");
                }
              } catch (err) {
                console.error("Error setting accounts", err);
                setErrorMsg(
                  "Erro procesando as contas devolvidas pola entidade",
                );
              } finally {
                setLoadingTransactions(false);
              }
            }
          })
          .catch((err) => {
            console.error(err);
            setLoadingTransactions(false);
            setErrorMsg("Fallo de conexión ao descargar as contas");
          });
      } else if (event.data?.type === "ENABLEBANKING_AUTH_ERROR") {
        setErrorMsg(`Erro de Enable Banking: ${event.data.error}`);
        setLoadingTransactions(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const selectedBank = aspsps.find((a) => a.name === selectedAspsp);

  if (step === 2) {
    return (
      <div className="space-y-4 w-full text-left">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start space-x-3 border border-red-100 mb-4">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Selecciona as contas a importar
        </h3>
        <div className="space-y-2 mb-6">
          {accounts.map((acc: any) => {
            const id = acc.uid || acc.account_id?.iban || acc.id;
            const name = acc.name || acc.product || acc.account_id?.iban || id;
            let balanceStr = "Saldo descoñecido";
            if (acc.balances && acc.balances.length > 0) {
              const bal =
                acc.balances[0].balanceAmount || acc.balances[0].amount || {};
              if (bal.amount !== undefined) {
                balanceStr = `${bal.amount} ${bal.currency || acc.currency || "EUR"}`;
              } else if (
                acc.balances[0] !== undefined &&
                typeof acc.balances[0] === "number"
              ) {
                balanceStr = `${acc.balances[0]} ${acc.currency || "EUR"}`;
              }
            }

            return (
              <label
                key={id}
                className="flex items-center space-x-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedAccounts((prev) => [...prev, id]);
                    else
                      setSelectedAccounts((prev) =>
                        prev.filter((x) => x !== id),
                      );
                  }}
                  className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-slate-800">{name}</p>
                  <p className="text-xs text-slate-500">{balanceStr}</p>
                </div>
              </label>
            );
          })}
        </div>
        <button
          onClick={handleImportTransactions}
          disabled={loading || selectedAccounts.length === 0}
          className={`w-full relative group cursor-pointer flex justify-center py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center ${loading || selectedAccounts.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
        >
          {loading
            ? "Importando movementos..."
            : `Importar ${selectedAccounts.length} contas`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full text-left">
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start space-x-3 border border-red-100 mb-4">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="relative mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Selecciona un banco
        </label>
        <div className="relative">
          <select
            value={selectedAspsp}
            onChange={(e) => setSelectedAspsp(e.target.value)}
            disabled={loading}
            className="w-full appearance-none block bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="">Selecciona o teu banco...</option>
            {aspsps
              .filter((a) => a.country === "ES")
              .map((aspsp, i) => (
                <option key={i} value={aspsp.name}>
                  {aspsp.name}
                </option>
              ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <div className="relative mb-6 text-left">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Importar dende (Ata a actualidade)
        </label>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={loading}
            className="w-full appearance-none block bg-slate-50 border border-slate-200 text-slate-900 pl-10 pr-4 py-3 rounded-xl hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors cursor-pointer"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Calendar size={18} />
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          if (selectedBank) {
            handleStartAuth(selectedBank);
          }
        }}
        disabled={!selectedBank || loading}
        className={`w-full relative group cursor-pointer flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 transition-all duration-300 text-center space-y-4 ${!selectedBank || loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          {loading ? (
            <Loader2 size={28} className="animate-spin" />
          ) : (
            <Landmark size={28} />
          )}
        </div>
        <div>
          <p className="font-bold text-slate-800">
            {loading ? "Cargando movementos..." : "Conectar con Enable Banking"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loading
              ? "Estamos conectando ca túa entidade..."
              : "Conecta a túa conta usando Open Banking."}
          </p>
        </div>
      </button>
    </div>
  );
}

function MonthGroup({
  monthStr,
  transactions,
  isExpanded,
  onToggle,
  onUpdateCategory,
  onUpdateSuperCategory,
  onUpdateReceipt,
  availableCategories,
  availableSuperCategories,
  accountBalances,
}: {
  monthStr: string;
  transactions: Transaction[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
  onUpdateSuperCategory: (txId: string, newSuperCategory: string) => Promise<void>;
  onUpdateReceipt: (txId: string, receiptData: any) => Promise<void>;
  availableCategories: string[];
  availableSuperCategories: string[];
  accountBalances: AccountBalance[];
}) {
  const [year, month] = monthStr.split("-");
  const total = transactions.reduce((acc, tx) => acc + tx.amount, 0);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editCategoryVal, setEditCategoryVal] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [editingSuperTxId, setEditingSuperTxId] = useState<string | null>(null);
  const [editSuperCategoryVal, setEditSuperCategoryVal] = useState<string>("");
  const [showSuperSuggestions, setShowSuperSuggestions] = useState(false);

  const [ocrLoadingTxId, setOcrLoadingTxId] = useState<string | null>(null);

  const handleFileUpload = async (
    txId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoadingTxId(txId);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];

        const response = await fetch("/api/ocr-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro da API");
        }

        const receiptData = await response.json();
        await onUpdateReceipt(txId, receiptData);
        setOcrLoadingTxId(null);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      alert("Non se puido procesar o ticket.");
      setOcrLoadingTxId(null);
    }
  };

  const handleEditClick = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTxId(tx.transaction_id);
    setEditCategoryVal(tx.category || "");
    setShowSuggestions(true);
  };

  const handleSave = async (txId: string) => {
    await onUpdateCategory(txId, editCategoryVal);
    setEditingTxId(null);
    setShowSuggestions(false);
  };

  const handleSuperEditClick = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSuperTxId(tx.transaction_id);
    setEditSuperCategoryVal(tx.superCategory || "");
    setShowSuperSuggestions(true);
  };

  const handleSuperSave = async (txId: string) => {
    await onUpdateSuperCategory(txId, editSuperCategoryVal);
    setEditingSuperTxId(null);
    setShowSuperSuggestions(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center text-left border-b border-slate-100 pb-2 hover:bg-slate-50 transition-colors cursor-pointer group px-2 rounded-t-xl"
      >
        <h3 className="font-bold text-lg text-slate-800 capitalize flex items-center gap-2">
          <ChevronDown
            size={18}
            className={`text-slate-400 group-hover:text-slate-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
          {new Date(Number(year), Number(month) - 1).toLocaleDateString(
            "gl-ES",
            { month: "long", year: "numeric" },
          )}
        </h3>
        <div
          className={`font-bold ${total < 0 ? "text-slate-900" : "text-green-600"}`}
        >
          {total > 0 && "+"}
          {total.toFixed(2)} €
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {transactions.map((tx, idx) => {
            const userAccount = getBankNameForTx(tx, accountBalances);
            return (
              <div
                key={
                  tx.transaction_id
                    ? `${tx.transaction_id}-${idx}`
                    : `tx-${idx}`
                }
                className="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">
                    {tx.name}
                    {tx.counterparty && (
                      <span
                        className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-semibold whitespace-nowrap"
                        title="Contraparte"
                      >
                        {tx.counterparty}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-500">
                      <span
                        title="Data na que se realizou a operación"
                        className="cursor-help"
                      >
                        {new Date(tx.date).toLocaleDateString("gl-ES")}
                      </span>
                      {tx.bookingDate &&
                        tx.valueDate &&
                        new Date(tx.bookingDate).getTime() !==
                          new Date(tx.valueDate).getTime() && (
                          <span
                            title="Data na que o movemento se asenta definitivamente no banco"
                            className="ml-2 text-xs opacity-75 cursor-help bg-slate-100 px-1.5 py-0.5 rounded"
                          >
                            Ascento:{" "}
                            {new Date(tx.bookingDate).toLocaleDateString(
                              "gl-ES",
                            )}
                          </span>
                        )}
                    </p>

                    {(userAccount || tx.counterpartyIban) && (
                      <div className="flex items-center gap-1.5 ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {tx.amount > 0 ? (
                          <>
                            {tx.counterpartyIban && (
                              <span title="Orixe do pagamento">
                                {tx.counterpartyIban}
                              </span>
                            )}
                            {tx.counterpartyIban && userAccount && (
                              <span>→</span>
                            )}
                            {userAccount && (
                              <span
                                title="A túa conta receptora"
                                className="text-slate-600"
                              >
                                {userAccount}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {userAccount && (
                              <span
                                title="A túa conta emisora"
                                className="text-slate-600"
                              >
                                {userAccount}
                              </span>
                            )}
                            {tx.counterpartyIban && userAccount && (
                              <span>→</span>
                            )}
                            {tx.counterpartyIban && (
                              <span title="Destino do pagamento">
                                {tx.counterpartyIban}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {tx.mcc && (
                      <div
                        className="flex items-center gap-1.5 ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full cursor-help"
                        title={`Código de categoría de comerciante (MCC): ${tx.mccDescription || "Sen descrición"}`}
                      >
                        <span className="opacity-75">MCC:</span>
                        <span>{tx.mcc}</span>
                        {tx.mccDescription && (
                          <span className="max-w-[120px] truncate">
                            &bull; {tx.mccDescription}
                          </span>
                        )}
                      </div>
                    )}

                    {editingSuperTxId === tx.transaction_id ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={editSuperCategoryVal}
                          onChange={(e) => {
                            setEditSuperCategoryVal(e.target.value);
                            setShowSuperSuggestions(true);
                          }}
                          onFocus={() => setShowSuperSuggestions(true)}
                          className="text-xs px-2 py-1 rounded bg-white border border-slate-300 outline-none focus:border-indigo-500 shadow-sm w-36"
                          placeholder="Supercategoría"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingSuperTxId(null);
                              setShowSuperSuggestions(false);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              handleSuperSave(tx.transaction_id);
                            }, 150);
                          }}
                        />
                        {showSuperSuggestions && availableSuperCategories.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto top-full right-0 text-left">
                            {(editSuperCategoryVal === (tx.superCategory || "")
                              ? availableSuperCategories
                              : availableSuperCategories.filter((cat) =>
                                  cat
                                    .toLowerCase()
                                    .includes(editSuperCategoryVal.toLowerCase()),
                                )
                            ).map((cat) => (
                              <div
                                key={cat}
                                className="px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-100 text-slate-700 break-words"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditSuperCategoryVal(cat);
                                  onUpdateSuperCategory(tx.transaction_id, cat);
                                  setEditingSuperTxId(null);
                                  setShowSuperSuggestions(false);
                                }}
                              >
                                {cat}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        onClick={(e) => handleSuperEditClick(tx, e)}
                        className="inline-block px-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full cursor-pointer transition-colors whitespace-nowrap"
                        title="Editar supercategoría"
                      >
                        {tx.superCategory || "+ Engadir supercategoría"}
                      </span>
                    )}

                    {editingTxId === tx.transaction_id ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={editCategoryVal}
                          onChange={(e) => {
                            setEditCategoryVal(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          className="text-xs px-2 py-1 rounded bg-white border border-slate-300 outline-none focus:border-blue-500 shadow-sm w-36"
                          placeholder="Categoría"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingTxId(null);
                              setShowSuggestions(false);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              handleSave(tx.transaction_id);
                            }, 150);
                          }}
                        />
                        {showSuggestions && availableCategories.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto top-full right-0 text-left">
                            {(editCategoryVal === (tx.category || "")
                              ? availableCategories
                              : availableCategories.filter((cat) =>
                                  cat
                                    .toLowerCase()
                                    .includes(editCategoryVal.toLowerCase()),
                                )
                            ).map((cat) => (
                              <div
                                key={cat}
                                className="px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-100 text-slate-700 break-words"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Mante o foco no input temporalmente
                                  setEditCategoryVal(cat);
                                  onUpdateCategory(tx.transaction_id, cat);
                                  setEditingTxId(null);
                                  setShowSuggestions(false);
                                }}
                              >
                                {cat}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        onClick={(e) => handleEditClick(tx, e)}
                        className="inline-block px-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full cursor-pointer transition-colors whitespace-nowrap"
                        title="Editar clasificación"
                      >
                        {tx.category || "+ Engadir categoría"}
                      </span>
                    )}

                    {!tx.receiptDetails && (
                      <label
                        className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors whitespace-nowrap ${ocrLoadingTxId === tx.transaction_id ? "bg-amber-50 text-amber-600 cursor-wait" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
                        title="Ler ticket de compra (OCR IA)"
                      >
                        {ocrLoadingTxId === tx.transaction_id ? (
                          <>
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Lendo...
                          </>
                        ) : (
                          "+ Ticket"
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(tx.transaction_id, e)
                          }
                          disabled={ocrLoadingTxId === tx.transaction_id}
                        />
                      </label>
                    )}
                  </div>

                  {tx.receiptDetails && (
                    <div className="mt-3 p-3 bg-white border border-slate-200 shadow-sm rounded-lg text-sm w-full animate-fade-in max-w-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-slate-800">
                            {tx.receiptDetails.merchant ||
                              "Sen nome do comercio"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {tx.receiptDetails.date || "Data descoñecida"}
                          </div>
                        </div>
                        <div className="font-bold text-slate-900">
                          {tx.receiptDetails.totalAmount?.toFixed(2) || "0.00"}{" "}
                          €
                        </div>
                      </div>
                      {tx.receiptDetails.items &&
                        tx.receiptDetails.items.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1 mt-2 max-h-32 overflow-y-auto">
                            {tx.receiptDetails.items.map((item, idxi) => (
                              <div
                                key={idxi}
                                className="flex justify-between text-xs text-slate-600"
                              >
                                <span className="truncate pr-2 block">
                                  {item.name}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {(item.price || 0).toFixed(2)} €
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
                <div
                  className={`font-bold text-lg shrink-0 ml-4 ${tx.amount < 0 ? "text-slate-900" : "text-green-600"}`}
                >
                  {tx.amount < 0 ? "-" : "+"}
                  {Math.abs(tx.amount).toFixed(2)} €
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoriesManager({
  transactions,
  availableCategories,
  setTransactions,
  onUpdateCategory,
}: {
  transactions: Transaction[];
  availableCategories: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateCategory: (txId: string, newCategory: string) => Promise<void>;
}) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedSuperCats, setCollapsedSuperCats] = useState<Set<string>>(
    new Set(),
  );
  const [sortBy, setSortBy] = useState<"alpha" | "count" | "amount">("alpha");

  // States for single tx classification
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxCategoryVal, setEditTxCategoryVal] = useState<string>("");
  const [showTxSuggestions, setShowTxSuggestions] = useState(false);

  // States for superCategory edit
  const [editingSuperCatFor, setEditingSuperCatFor] = useState<string | null>(
    null,
  );
  const [superCatEditVal, setSuperCatEditVal] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // States for bulk editing
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const [selectedTxNames, setSelectedTxNames] = useState<Set<string>>(
    new Set(),
  );
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSuperCategory, setBulkSuperCategory] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSortBy, setBulkSortBy] = useState<
    "count" | "name" | "superCategory" | "category"
  >("count");
  const [bulkSortOrder, setBulkSortOrder] = useState<"asc" | "desc">("desc");
  const [bulkCatFilter, setBulkCatFilter] = useState<
    "all" | "with" | "without"
  >("all");
  const [bulkSuperCatFilter, setBulkSuperCatFilter] = useState<
    "all" | "with" | "without"
  >("all");

  const [showResetRulesModal, setShowResetRulesModal] = useState(false);
  const [resetExistingTransactions, setResetExistingTransactions] =
    useState(false);
  const [isDeletingRules, setIsDeletingRules] = useState(false);
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [resetRulesMessage, setResetRulesMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAutoClassify = async () => {
    setIsAutoClassifying(true);
    try {
      const updatedCount = await autoClassifyCurrentTransactions();

      // Reload transactions to match DB state
      const reloadedTxs = await getTransactionsFromFirestore();
      setTransactions(reloadedTxs);

      if (updatedCount && updatedCount > 0) {
        alert(
          `Auto-clasificación completada. Actualizáronse ${updatedCount} movementos.`,
        );
      } else {
        alert(
          "Non se atoparon movementos novos para auto-clasificar coas regras actuais. Recorda que primeiro tes que clasificar e gardar regras para que isto funcione.",
        );
      }
    } catch (e) {
      console.error(e);
      alert("Houbo un erro ao auto-clasificar os movementos.");
    } finally {
      setIsAutoClassifying(false);
    }
  };

  const executeClearLearnedRules = async () => {
    setIsDeletingRules(true);
    setResetRulesMessage(null);
    try {
      await deleteAllLearnedCategories();

      if (resetExistingTransactions) {
        await resetAllTransactionCategories();

        // Also update local state
        setTransactions((prev) =>
          prev.map((t) => ({
            ...t,
            category: undefined,
            superCategory: undefined,
          })),
        );
      }

      setResetRulesMessage({
        type: "success",
        text: "As regras foron eliminadas correctamente.",
      });
      setTimeout(() => {
        setResetRulesMessage(null);
        setShowResetRulesModal(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setResetRulesMessage({
        type: "error",
        text: "Houbo un erro ao intentar eliminar as regras.",
      });
    } finally {
      setIsDeletingRules(false);
    }
  };

  const handleBulkSave = async () => {
    if (selectedTxNames.size === 0) return;
    setBulkSaving(true);
    try {
      const namesArray = Array.from(selectedTxNames);

      // Update the DB
      await bulkUpdateTransactionsByNames(
        namesArray,
        bulkCategory,
        bulkSuperCategory,
      );

      // For each name, also learn the category for the future
      if (bulkCategory || bulkSuperCategory) {
        for (const name of namesArray) {
          await learnCategory(name, bulkCategory, bulkSuperCategory);
        }
      }

      // Update local state
      setTransactions((prev) =>
        prev.map((t) => {
          if (selectedTxNames.has(t.name)) {
            const updated = { ...t };
            if (bulkCategory) updated.category = bulkCategory;
            if (bulkSuperCategory) updated.superCategory = bulkSuperCategory;
            return updated;
          }
          return t;
        }),
      );

      // Reset
      setSelectedTxNames(new Set());
      setBulkCategory("");
      setBulkSuperCategory("");
      setIsBulkEdit(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao aplicar as clasificacións masivas");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleEditTxClick = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTxId(tx.transaction_id);
    setEditTxCategoryVal(tx.category || "");
    setShowTxSuggestions(true);
  };

  const handleSaveTx = async (txId: string) => {
    await onUpdateCategory(txId, editTxCategoryVal);
    setEditingTxId(null);
    setShowTxSuggestions(false);
  };


  const handleSaveSuperCat = async (category: string, oldSuperCat: string) => {
    if (superCatEditVal.trim() !== oldSuperCat) {
      const newSuper = superCatEditVal.trim();
      const matchOld =
        oldSuperCat === "Sen clasificación superior" ? "" : oldSuperCat;
      try {
        await assignSuperCategory(category, newSuper, matchOld);
        setTransactions((prev) =>
          prev.map((t) =>
            t.category === category && (t.superCategory || "") === matchOld
              ? { ...t, superCategory: newSuper }
              : t,
          ),
        );
      } catch (err) {
        console.error(err);
        alert("Erro ao asignar clasificación superior");
      }
    }
    setEditingSuperCatFor(null);
  };

  // Filter transactions and categories based on search
  const filteredTxs = transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.counterparty?.toLowerCase().includes(q) ||
      t.superCategory?.toLowerCase().includes(q)
    );
  });

  const bulkTableTxs = filteredTxs.filter((t) => {
    if (bulkCatFilter === "with" && !t.category) return false;
    if (bulkCatFilter === "without" && t.category) return false;
    if (bulkSuperCatFilter === "with" && !t.superCategory) return false;
    if (bulkSuperCatFilter === "without" && t.superCategory) return false;
    return true;
  });

  const activeCategories = Array.from(
    new Set(filteredTxs.map((t) => t.category || "Sen clasificar")),
  ) as string[];

  const activeSuperCats = Array.from(
    new Set(
      filteredTxs.map((t) => t.superCategory || "Sen clasificación superior"),
    ),
  ) as string[];

  // Create a list of unique (superCategory, category) combinations
  const activeCombinations = Array.from(
    new Set(
      filteredTxs.map(
        (t) =>
          `${t.superCategory || "Sen clasificación superior"}|||${t.category || "Sen clasificar"}`,
      ),
    ),
  );
  const allExpanded =
    activeCombinations.length > 0 &&
    expandedCategories.size === activeCombinations.length &&
    collapsedSuperCats.size === 0;

  const toggleAllCategories = () => {
    if (allExpanded) {
      setExpandedCategories(new Set());
      setCollapsedSuperCats(new Set(activeSuperCats));
    } else {
      setExpandedCategories(new Set(activeCombinations));
      setCollapsedSuperCats(new Set());
    }
  };

  const toggleCategory = (comboKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(comboKey)) next.delete(comboKey);
      else next.add(comboKey);
      return next;
    });
  };

  const toggleSuperCat = (superCat: string) => {
    setCollapsedSuperCats((prev) => {
      const next = new Set(prev);
      if (next.has(superCat)) {
        next.delete(superCat);
      } else {
        next.add(superCat);
      }
      return next;
    });
  };

  const handleEditClick = (
    comboKey: string,
    category: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingCategory(comboKey);
    setEditVal(category);
  };

  const handleSave = async (
    oldCategory: string,
    oldSuperCategoryComboValue: string,
  ) => {
    if (editVal.trim() && editVal.trim() !== oldCategory) {
      const newCat = editVal.trim();
      const matchOldSuper =
        oldSuperCategoryComboValue === "Sen clasificación superior"
          ? ""
          : oldSuperCategoryComboValue;
      try {
        await renameCategory(oldCategory, newCat, matchOldSuper);
        setTransactions((prev) =>
          prev.map((t) =>
            t.category === oldCategory &&
            (t.superCategory || "") === matchOldSuper
              ? { ...t, category: newCat }
              : t,
          ),
        );
      } catch (err) {
        console.error(err);
        alert("Erro ao renomear a categoría");
      }
    }
    setEditingCategory(null);
  };

  // Calculate available super categories for suggestions
  const superCategories = Array.from(
    new Set([
      ...PREDEFINED_SUPERCATEGORIES,
      ...(transactions.map((t) => t.superCategory).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      {isAutoClassifying && (
        <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm shadow-sm rounded-2xl flex items-center justify-center space-x-3 border border-blue-200">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium text-blue-800">
            Clasificando os movementos de forma automática... Isto pode tardar
            uns segundos.
          </p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-8 pb-4 border-b border-slate-100 gap-4 xl:gap-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mr-2">
            Clasificacións
          </h2>
          <button
            onClick={handleAutoClassify}
            disabled={isAutoClassifying}
            className="text-sm font-medium px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            title="Auto-clasificar os movementos e actualizar as categorías seguindo as regras aprendidas gardadas"
          >
            {isAutoClassifying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            {isAutoClassifying ? "Clasificando..." : "Clasificación automática"}
          </button>
          <button
            onClick={() => setShowResetRulesModal(true)}
            disabled={isDeletingRules}
            className="text-sm font-medium px-4 py-2 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            title="Eliminar as regras de auto-clasificación aprendidas para futuros movementos"
          >
            {isDeletingRules ? (
              <Loader2 size={16} className="animate-spin" />
            ) : null}
            Reiniciar regras
          </button>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-4 py-2 text-sm font-medium bg-white border border-slate-200 outline-none focus:border-blue-500 rounded-lg text-slate-700 shadow-sm transition-colors"
            />
          </div>
          {filteredTxs.length > 0 && (
            <>
              <button
                onClick={() => setIsBulkEdit(!isBulkEdit)}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm whitespace-nowrap ${isBulkEdit ? "bg-blue-600 text-white border border-blue-600" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
              >
                {isBulkEdit ? "Pechar edición masiva" : "Edición masiva"}
              </button>

              {!isBulkEdit && (
                <>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm font-medium text-slate-700 bg-white border border-slate-200 outline-none focus:border-blue-500 rounded-lg px-3 py-2 cursor-pointer shadow-sm transition-colors"
                  >
                    <option value="alpha">Alfabética</option>
                    <option value="count">Nº elementos</option>
                    <option value="amount">Importe total</option>
                  </select>
                  <button
                    onClick={toggleAllCategories}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-4 py-2 border border-slate-200 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {allExpanded ? "Reducir todo" : "Expandir todo"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isBulkEdit ? (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-bold text-blue-800 uppercase">
                Clasificación Superior
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bulkSuperCategory}
                  onChange={(e) => setBulkSuperCategory(e.target.value)}
                  placeholder="Ex: Fogar"
                  list="bulk-supercats"
                  className="w-full px-4 py-2 rounded-xl border border-blue-200 outline-none focus:border-blue-500"
                />
                <datalist id="bulk-supercats">
                  {superCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-bold text-blue-800 uppercase">
                Clasificación
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  placeholder="Ex: Internet"
                  list="bulk-cats"
                  className="w-full px-4 py-2 rounded-xl border border-blue-200 outline-none focus:border-blue-500"
                />
                <datalist id="bulk-cats">
                  {availableCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <button
              onClick={handleBulkSave}
              disabled={
                bulkSaving ||
                selectedTxNames.size === 0 ||
                (!bulkCategory && !bulkSuperCategory)
              }
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2 h-[42px]"
            >
              {bulkSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : null}
              <span>Gardar ({selectedTxNames.size})</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">
                  Categoría:
                </label>
                <select
                  value={bulkCatFilter}
                  onChange={(e) => setBulkCatFilter(e.target.value as any)}
                  className="text-sm font-medium text-slate-700 bg-white border border-slate-200 outline-none focus:border-blue-500 rounded-lg px-3 py-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <option value="all">Todas</option>
                  <option value="with">Con categoría</option>
                  <option value="without">Sen categoría</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">
                  Superclasificación:
                </label>
                <select
                  value={bulkSuperCatFilter}
                  onChange={(e) => setBulkSuperCatFilter(e.target.value as any)}
                  className="text-sm font-medium text-slate-700 bg-white border border-slate-200 outline-none focus:border-blue-500 rounded-lg px-3 py-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <option value="all">Todas</option>
                  <option value="with">Con superclasif.</option>
                  <option value="without">Sen superclasif.</option>
                </select>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-500">
              Amosando {new Set(bulkTableTxs.map((t) => t.name)).size}{" "}
              movementos{" "}
              {bulkTableTxs.length !== filteredTxs.length
                ? `(filtrados de ${new Set(filteredTxs.map((t) => t.name)).size})`
                : ""}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all unique names in current filter
                            const names = Array.from(
                              new Set(bulkTableTxs.map((t) => t.name)),
                            );
                            setSelectedTxNames(new Set(names));
                          } else {
                            setSelectedTxNames(new Set());
                          }
                        }}
                        checked={
                          selectedTxNames.size > 0 &&
                          selectedTxNames.size ===
                            new Set(bulkTableTxs.map((t) => t.name)).size
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th
                      className="px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => {
                        if (bulkSortBy === "name")
                          setBulkSortOrder((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        else {
                          setBulkSortBy("name");
                          setBulkSortOrder("asc");
                        }
                      }}
                    >
                      Descrición{" "}
                      {bulkSortBy === "name"
                        ? bulkSortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => {
                        if (bulkSortBy === "superCategory")
                          setBulkSortOrder((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        else {
                          setBulkSortBy("superCategory");
                          setBulkSortOrder("asc");
                        }
                      }}
                    >
                      Super Clas. Actual{" "}
                      {bulkSortBy === "superCategory"
                        ? bulkSortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => {
                        if (bulkSortBy === "category")
                          setBulkSortOrder((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        else {
                          setBulkSortBy("category");
                          setBulkSortOrder("asc");
                        }
                      }}
                    >
                      Clasificación Actual{" "}
                      {bulkSortBy === "category"
                        ? bulkSortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase text-right cursor-pointer hover:bg-slate-200 transition-colors"
                      onClick={() => {
                        if (bulkSortBy === "count")
                          setBulkSortOrder((prev) =>
                            prev === "asc" ? "desc" : "asc",
                          );
                        else {
                          setBulkSortBy("count");
                          setBulkSortOrder("desc");
                        }
                      }}
                    >
                      Cantidade{" "}
                      {bulkSortBy === "count"
                        ? bulkSortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(() => {
                    // Group by name
                    const grouped = bulkTableTxs.reduce(
                      (acc, t) => {
                        if (!acc[t.name]) {
                          acc[t.name] = {
                            name: t.name,
                            category: t.category || "",
                            superCategory: t.superCategory || "",
                            count: 0,
                          };
                        }
                        acc[t.name].count += 1;
                        return acc;
                      },
                      {} as Record<
                        string,
                        {
                          name: string;
                          category: string;
                          superCategory: string;
                          count: number;
                        }
                      >,
                    );

                    const sortedGroups = Object.values(grouped).sort((a, b) => {
                      if (bulkSortBy === "count") {
                        if (
                          a.category === "📦 Outros" &&
                          b.category !== "📦 Outros"
                        )
                          return -1;
                        if (
                          a.category !== "📦 Outros" &&
                          b.category === "📦 Outros"
                        )
                          return 1;
                      }

                      if (bulkSortBy === "name") {
                        return bulkSortOrder === "asc"
                          ? a.name.localeCompare(b.name)
                          : b.name.localeCompare(a.name);
                      } else if (bulkSortBy === "superCategory") {
                        return bulkSortOrder === "asc"
                          ? a.superCategory.localeCompare(b.superCategory)
                          : b.superCategory.localeCompare(a.superCategory);
                      } else if (bulkSortBy === "category") {
                        return bulkSortOrder === "asc"
                          ? a.category.localeCompare(b.category)
                          : b.category.localeCompare(a.category);
                      } else {
                        return bulkSortOrder === "asc"
                          ? a.count - b.count
                          : b.count - a.count;
                      }
                    });

                    if (sortedGroups.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            Non hai movementos que coincidan coa busca.
                          </td>
                        </tr>
                      );
                    }

                    return sortedGroups.map((group) => (
                      <tr
                        key={group.name}
                        className={`hover:bg-blue-50/50 transition-colors ${selectedTxNames.has(group.name) ? "bg-blue-50/30" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTxNames.has(group.name)}
                            onChange={(e) => {
                              setSelectedTxNames((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(group.name);
                                else next.delete(group.name);
                                return next;
                              });
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 mt-1"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-sm">
                          {group.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {group.superCategory || (
                            <span className="text-slate-300 italic">
                              Sen asignar
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {group.category === "📦 Outros" ||
                          group.category === "Outros" ||
                          !group.category ? (
                            <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md">
                              Sen clasificar
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                              {group.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 text-right">
                          {group.count} mov.
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeCategories.length === 0 ? (
        <p className="text-slate-500 text-center py-12">
          {searchQuery
            ? "Non se atopou ningunha clasificación."
            : "Aínda non tes categorías. Asigna algunha na pestana de movementos."}
        </p>
      ) : (
        <div className="space-y-8">
          {(() => {
            const catAndSuperCatPairs = filteredTxs.map((t) => ({
              category: t.category || "Sen clasificar",
              superCategory: t.superCategory || "Sen clasificación superior",
            }));
            const uniquePairs = Array.from(
              new Set(catAndSuperCatPairs.map((p) => JSON.stringify(p))),
            ).map((p) => JSON.parse(p));

            const categoriesBySuperCat = uniquePairs.reduce(
              (acc, pair: { category: string; superCategory: string }) => {
                if (!acc[pair.superCategory]) acc[pair.superCategory] = [];
                acc[pair.superCategory].push(pair.category);
                return acc;
              },
              {} as Record<string, string[]>,
            );

            const sortedSuperCats = Object.keys(categoriesBySuperCat).sort(
              (a, b) => {
                if (a === "Sen clasificación superior") return 1;
                if (b === "Sen clasificación superior") return -1;
                return a.localeCompare(b);
              },
            );

            return sortedSuperCats.map((superCat) => {
              const groupCats = categoriesBySuperCat[superCat];
              const groupTxsForTotal = filteredTxs.filter(
                (t) =>
                  groupCats.includes(t.category || "Sen clasificar") &&
                  (t.superCategory || "Sen clasificación superior") ===
                    superCat,
              );
              const groupTotal = groupTxsForTotal.reduce(
                (acc, t) => acc + t.amount,
                0,
              );

              return (
                <div key={superCat} className="space-y-4">
                  <div
                    onClick={() => toggleSuperCat(superCat)}
                    className="flex items-center justify-between pb-2 border-b border-slate-200 cursor-pointer group hover:border-slate-300 transition-colors"
                  >
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <ChevronDown
                        size={20}
                        className={`mr-2 text-slate-400 min-w-4 transition-transform group-hover:text-slate-600 ${collapsedSuperCats.has(superCat) ? "" : "rotate-180"}`}
                      />
                      {superCat}
                      <span className="ml-3 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                        {groupCats.length}{" "}
                        {groupCats.length === 1
                          ? "clasificación"
                          : "clasificacións"}
                      </span>
                    </h3>
                    <div
                      className={`font-bold text-lg ${groupTotal < 0 ? "text-slate-900" : "text-green-600"}`}
                    >
                      {groupTotal > 0 && "+"}
                      {groupTotal.toFixed(2)} €
                    </div>
                  </div>

                  {!collapsedSuperCats.has(superCat) && (
                    <div className="space-y-4 pl-0 sm:pl-4 sm:border-l-2 border-slate-100">
                      {groupCats.map((category: string) => {
                        const txs = filteredTxs.filter(
                          (t) =>
                            (t.category || "Sen clasificar") === category &&
                            (t.superCategory ||
                              "Sen clasificación superior") === superCat,
                        );
                        const total = txs.reduce((acc, t) => acc + t.amount, 0);
                        const comboKey = `${superCat}|||${category}`;
                        const isExpanded = expandedCategories.has(comboKey);

                        return (
                          <div
                            key={comboKey}
                            className="border border-slate-100 rounded-2xl overflow-hidden transition-all duration-200"
                          >
                            <div
                              onClick={() => toggleCategory(comboKey)}
                              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50 border-b border-slate-100" : ""}`}
                            >
                              <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <div className="flex items-center space-x-3">
                                  <ChevronDown
                                    size={18}
                                    className={`text-slate-400 min-w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                  {editingCategory === comboKey &&
                                  category !== "Sen clasificar" ? (
                                    <input
                                      type="text"
                                      value={editVal}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        setEditVal(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        handleSave(category, superCat)
                                      }
                                      onBlur={() =>
                                        handleSave(category, superCat)
                                      }
                                      autoFocus
                                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 w-full sm:max-w-xs"
                                    />
                                  ) : (
                                    <div className="flex items-center group">
                                      <h3
                                        className={`font-bold ${category === "Sen clasificar" ? "text-amber-700" : "text-slate-800 hover:text-blue-600"} transition-colors`}
                                        onClick={(e) =>
                                          category !== "Sen clasificar" &&
                                          handleEditClick(comboKey, category, e)
                                        }
                                        title={
                                          category === "Sen clasificar"
                                            ? ""
                                            : "Editar clasificación"
                                        }
                                      >
                                        {category}
                                      </h3>
                                    </div>
                                  )}
                                </div>

                                {/* Super category display and edit */}
                                <div className="flex items-center ml-7 sm:ml-0 before:content-[''] before:hidden sm:before:block before:w-1 before:h-1 before:bg-slate-300 before:rounded-full before:mx-3">
                                  {editingSuperCatFor === comboKey &&
                                  category !== "Sen clasificar" ? (
                                    <div
                                      className="relative"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="text"
                                        value={superCatEditVal}
                                        onChange={(e) =>
                                          setSuperCatEditVal(e.target.value)
                                        }
                                        className="text-xs px-2 py-1 rounded-sm bg-white border border-slate-300 outline-none focus:border-blue-500 shadow-sm w-36"
                                        placeholder="Categoría superior"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            e.currentTarget.blur();
                                          if (e.key === "Escape")
                                            setEditingSuperCatFor(null);
                                        }}
                                        onBlur={() =>
                                          setTimeout(
                                            () =>
                                              handleSaveSuperCat(
                                                category,
                                                superCat,
                                              ),
                                            150,
                                          )
                                        }
                                        list={`super-categories`}
                                      />
                                      <datalist id="super-categories">
                                        {superCategories.map((cat) => (
                                          <option key={cat} value={cat} />
                                        ))}
                                      </datalist>
                                    </div>
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (category !== "Sen clasificar") {
                                          setEditingSuperCatFor(comboKey);
                                          setSuperCatEditVal(
                                            superCat ===
                                              "Sen clasificación superior"
                                              ? ""
                                              : superCat,
                                          );
                                        }
                                      }}
                                      className={`inline-block px-2 py-0.5 text-xs font-medium ${category === "Sen clasificar" ? "text-slate-400 bg-slate-50" : "text-slate-500 bg-slate-100 hover:bg-slate-200 cursor-pointer"} rounded-md transition-colors`}
                                      title={
                                        category === "Sen clasificar"
                                          ? ""
                                          : "Fai clic para editar"
                                      }
                                    >
                                      {superCat === "Sen clasificación superior"
                                        ? "+ Clasificación superior"
                                        : superCat}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4 sm:mt-0 flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end pl-7 sm:pl-0">
                                <p className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                                  {txs.length}{" "}
                                  {txs.length === 1
                                    ? "movemento"
                                    : "movementos"}
                                </p>
                                <div
                                  className={`font-bold text-lg min-w-[100px] text-right ${total < 0 ? "text-slate-900" : "text-green-600"}`}
                                >
                                  {total > 0 && "+"}
                                  {total.toFixed(2)} €
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-2 space-y-1 bg-white">
                                {txs.map((tx, idx) => (
                                  <div
                                    key={tx.transaction_id || idx}
                                    className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-medium text-sm text-slate-800">
                                        {tx.name}
                                        {tx.counterparty && (
                                          <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-semibold whitespace-nowrap">
                                            {tx.counterparty}
                                          </span>
                                        )}
                                      </p>
                                      <div className="flex items-center space-x-2">
                                        <p className="text-xs text-slate-500">
                                          {new Date(tx.date).toLocaleDateString(
                                            "gl-ES",
                                          )}
                                        </p>

                                        {/* TX category editing */}
                                        {editingTxId === tx.transaction_id ? (
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={editTxCategoryVal}
                                              onChange={(e) => {
                                                setEditTxCategoryVal(
                                                  e.target.value,
                                                );
                                                setShowTxSuggestions(true);
                                              }}
                                              onFocus={() =>
                                                setShowTxSuggestions(true)
                                              }
                                              className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-300 outline-none focus:border-blue-500 shadow-sm w-32"
                                              placeholder="Categoría"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                  e.currentTarget.blur();
                                                else if (e.key === "Escape")
                                                  setEditingTxId(null);
                                              }}
                                              onBlur={() =>
                                                setTimeout(
                                                  () =>
                                                    handleSaveTx(
                                                      tx.transaction_id,
                                                    ),
                                                  150,
                                                )
                                              }
                                            />
                                            {showTxSuggestions &&
                                              availableCategories.length >
                                                0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto top-full right-0 text-left">
                                                  {(editTxCategoryVal ===
                                                  (tx.category || "")
                                                    ? availableCategories
                                                    : availableCategories.filter(
                                                        (cat) =>
                                                          cat
                                                            .toLowerCase()
                                                            .includes(
                                                              editTxCategoryVal.toLowerCase(),
                                                            ),
                                                      )
                                                  ).map((cat) => (
                                                    <div
                                                      key={cat}
                                                      className="px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-100 text-slate-700 break-words"
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setEditTxCategoryVal(
                                                          cat,
                                                        );
                                                        onUpdateCategory(
                                                          tx.transaction_id,
                                                          cat,
                                                        );
                                                        setEditingTxId(null);
                                                        setShowTxSuggestions(
                                                          false,
                                                        );
                                                      }}
                                                    >
                                                      {cat}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                          </div>
                                        ) : (
                                          <span
                                            onClick={(e) =>
                                              handleEditTxClick(tx, e)
                                            }
                                            className="inline-block px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                          >
                                            {tx.category || "Reclasificar"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className={`font-bold text-sm ${tx.amount < 0 ? "text-slate-900" : "text-green-600"}`}
                                    >
                                      {tx.amount < 0 ? "-" : "+"}
                                      {Math.abs(tx.amount).toFixed(2)} €
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {showResetRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Eliminar regras aprendidas
            </h3>
            <p className="text-slate-600 mb-6 text-sm text-left">
              Isto eliminará todas as regras de auto-clasificación gardadas no
              sistema.
            </p>

            {!resetRulesMessage && (
              <div className="mb-6 flex items-start flex-row pt-4 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="resetExisting"
                  checked={resetExistingTransactions}
                  onChange={(e) =>
                    setResetExistingTransactions(e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="resetExisting"
                  className="ml-3 text-sm text-slate-700 text-left"
                >
                  Tamén eliminar as categorías xa asignadas a{" "}
                  <b>todos os movementos actuais</b> no sistema. (Volverán a
                  estar "Sen clasificar").
                </label>
              </div>
            )}

            {resetRulesMessage && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm font-medium ${resetRulesMessage.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
              >
                {resetRulesMessage.text}
              </div>
            )}

            {!resetRulesMessage && (
              <div className="flex space-x-4">
                <button
                  onClick={executeClearLearnedRules}
                  disabled={isDeletingRules}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 font-medium hover:bg-red-700 transition-colors flex justify-center flex-row items-center cursor-pointer disabled:opacity-50 gap-2"
                >
                  {isDeletingRules && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Confirmar
                </button>
                <button
                  onClick={() => setShowResetRulesModal(false)}
                  disabled={isDeletingRules}
                  className="flex-1 bg-white text-slate-700 rounded-xl py-3 font-medium border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoadingTransactions] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(
    new Set(),
  );

  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [currentTab, setCurrentTab] = useState<
    "overview" | "movements" | "categories" | "import" | "insights"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryUpdateDialog, setCategoryUpdateDialog] = useState<{
    txId: string;
    newCategory: string;
    txName: string;
    similarCount: number;
    showSystemLearn: boolean;
  } | null>(null);
  const [superCategoryUpdateDialog, setSuperCategoryUpdateDialog] = useState<{
    txId: string;
    newSuperCategory: string;
    txName: string;
    similarCount: number;
    showSystemLearn: boolean;
  } | null>(null);

  const [userPaydayStart, setUserPaydayStart] = useState<number | null>(null);
  const [userPaydayEnd, setUserPaydayEnd] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempPaydayStart, setTempPaydayStart] = useState<number>(28);
  const [tempPaydayEnd, setTempPaydayEnd] = useState<number>(31);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoadingTransactions(true);
        try {
          await createUserProfile();
          const profile = await getUserProfile();
          if (profile && profile.paydayStart) {
            setUserPaydayStart(profile.paydayStart);
            setTempPaydayStart(profile.paydayStart);
          }
          if (profile && profile.paydayEnd) {
            setUserPaydayEnd(profile.paydayEnd);
            setTempPaydayEnd(profile.paydayEnd);
          }
        } catch (e) {
          // ignore
        }
        try {
          const txs = await getTransactionsFromFirestore();
          setTransactions(txs);
          const accs = await getAccountsFromFirestore();
          setAccountBalances(accs);
        } catch (error) {
          console.error("Error loading initial data", error);
        }
        setLoadingTransactions(false);
      } else {
        setTransactions([]);
        setAccountBalances([]);
        setLoadingTransactions(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDeleteHistory = async () => {
    setLoadingTransactions(true);
    setAppError(null);
    try {
      await deleteAllUserTransactions();
      setTransactions([]);
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error("Erro ao borrar os datos", error);
      setAppError("Produciuse un erro ao tentar borrar os datos.");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleUpdateReceipt = async (txId: string, receiptData: any) => {
    try {
      await updateTransactionReceipt(txId, receiptData);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.transaction_id === txId
            ? { ...tx, receiptDetails: receiptData }
            : tx,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Non se puido gardar o ticket no movemento.");
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (tx.name || "").toLowerCase().includes(lowerQuery) ||
      (tx.category || "").toLowerCase().includes(lowerQuery) ||
      (tx.counterparty || "").toLowerCase().includes(lowerQuery)
    );
  });

  const groupedTransactions = filteredTransactions.reduce(
    (acc, tx) => {
      const d = new Date(tx.date);
      const yearMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!acc[yearMonth]) acc[yearMonth] = [];
      acc[yearMonth].push(tx);
      return acc;
    },
    {} as Record<string, Transaction[]>,
  );

  const availableCategories = Array.from(
    new Set([
      ...PREDEFINED_CATEGORIES,
      ...(transactions.map((tx) => tx.category).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const availableSuperCategories = Array.from(
    new Set([
      ...(transactions.map((tx) => tx.superCategory).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const sortedMonths = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a),
  );

  const allCollapsed =
    sortedMonths.length > 0 && collapsedMonths.size === sortedMonths.length;

  const toggleAllMonths = () => {
    if (allCollapsed) {
      setCollapsedMonths(new Set());
    } else {
      setCollapsedMonths(new Set(sortedMonths));
    }
  };

  const toggleMonth = (monthStr: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthStr)) {
        next.delete(monthStr);
      } else {
        next.add(monthStr);
      }
      return next;
    });
  };

  const executeCategoryUpdate = async (
    updateAll: boolean,
    teachSystem: boolean,
  ) => {
    if (!categoryUpdateDialog) return;
    const { txId, newCategory, txName } = categoryUpdateDialog;

    try {
      if (teachSystem && newCategory) {
        await learnCategory(txName, newCategory);
      }

      if (updateAll) {
        await updateTransactionsByCategoryAndName(txName, newCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.name === txName ? { ...tx, category: newCategory } : tx,
          ),
        );
      } else {
        await updateTransactionCategory(txId, newCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.transaction_id === txId ? { ...tx, category: newCategory } : tx,
          ),
        );
      }
    } catch (err) {
      console.error(err);
      setAppError("Erro ao actualizar a categoría");
    } finally {
      setCategoryUpdateDialog(null);
    }
  };

  const handleUpdateCategory = async (txId: string, newCategory: string) => {
    try {
      const txToUpdate = transactions.find((t) => t.transaction_id === txId);
      if (!txToUpdate) return;

      if (!newCategory) {
        // Just empty category without asking
        await updateTransactionCategory(txId, newCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.transaction_id === txId ? { ...tx, category: "" } : tx,
          ),
        );
        return;
      }

      const similarTxs = transactions.filter(
        (t) => t.name === txToUpdate.name && t.transaction_id !== txId,
      );

      setCategoryUpdateDialog({
        txId,
        newCategory,
        txName: txToUpdate.name,
        similarCount: similarTxs.length,
        showSystemLearn: true,
      });
    } catch (err) {
      console.error(err);
      setAppError("Erro ao actualizar a categoría");
    }
  };

  const executeSuperCategoryUpdate = async (
    updateAll: boolean,
    teachSystem: boolean,
  ) => {
    if (!superCategoryUpdateDialog) return;
    const { txId, newSuperCategory, txName } = superCategoryUpdateDialog;
    
    try {
      if (teachSystem && newSuperCategory) {
        await learnCategory(txName, undefined, newSuperCategory);
      }

      if (updateAll) {
        await updateTransactionsBySuperCategoryAndName(txName, newSuperCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.name === txName ? { ...tx, superCategory: newSuperCategory } : tx,
          ),
        );
      } else {
        await updateTransactionSuperCategory(txId, newSuperCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.transaction_id === txId ? { ...tx, superCategory: newSuperCategory } : tx,
          ),
        );
      }
    } catch (err) {
      console.error(err);
      setAppError("Erro ao actualizar a supercategoría");
    } finally {
      setSuperCategoryUpdateDialog(null);
    }
  };

  const handleUpdateSuperCategory = async (txId: string, newSuperCategory: string) => {
    try {
      const txToUpdate = transactions.find((t) => t.transaction_id === txId);
      if (!txToUpdate) return;

      if (!newSuperCategory) {
        await updateTransactionSuperCategory(txId, newSuperCategory);
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.transaction_id === txId ? { ...tx, superCategory: "" } : tx,
          ),
        );
        return;
      }

      const similarTxs = transactions.filter(
        (t) => t.name === txToUpdate.name && t.transaction_id !== txId,
      );

      setSuperCategoryUpdateDialog({
        txId,
        newSuperCategory,
        txName: txToUpdate.name,
        similarCount: similarTxs.length,
        showSystemLearn: true,
      });
    } catch (err) {
      console.error(err);
      setAppError("Erro ao actualizar a supercategoría");
    }
  };

  if (window.location.pathname === "/privacy") {
    return <PrivacyPolicy />;
  }

  if (window.location.pathname === "/terms") {
    return <TermsOfService />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const handleSaveSettings = async () => {
    try {
      await updateUserPaydayRange(tempPaydayStart, tempPaydayEnd);
      setUserPaydayStart(tempPaydayStart);
      setUserPaydayEnd(tempPaydayEnd);
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Error saving settings", error);
      alert("Houbo un erro ao gardar a configuración.");
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-8">
      <header className="text-center space-y-4 mt-8 mb-12 relative">
        {user && (
          <div className="absolute top-0 right-0 flex items-center space-x-2 sm:space-x-4">
            <span className="text-sm text-slate-500 hidden sm:inline-block">
              {user.email || user.phoneNumber || "User"}
            </span>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 sm:px-4 py-2 rounded-full transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Configuración</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 sm:px-4 py-2 rounded-full transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Saír</span>
            </button>
          </div>
        )}

        <div className="mx-auto w-20 h-20 bg-slate-800 text-white flex items-center justify-center rounded-3xl shadow-xl shadow-slate-900/10">
          <Wallet size={40} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          A vaca polo que vale
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Mantén un rexistro detallado das túas finanzas importando os teus
          movementos directamente da túa entidade mediante conexión segura.
        </p>
      </header>

      {!user ? (
        <AuthScreen />
      ) : (
        <div className="space-y-6">
          <div className="flex space-x-8 border-b border-slate-200">
            <button
              onClick={() => setCurrentTab("overview")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer ${
                currentTab === "overview"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              Visión Xeral
            </button>
            <button
              onClick={() => setCurrentTab("categories")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer ${
                currentTab === "categories"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              Clasificacións
            </button>
            <button
              onClick={() => setCurrentTab("insights")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                currentTab === "insights"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              <Bell size={16} /> Asistente
            </button>
            <button
              onClick={() => setCurrentTab("import")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer ${
                currentTab === "import"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              Importación
            </button>
            <button
              onClick={() => setCurrentTab("movements")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer ${
                currentTab === "movements"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              Movementos
            </button>
          </div>

          {currentTab === "overview" && (
            <Overview transactions={transactions} userPaydayStart={userPaydayStart} userPaydayEnd={userPaydayEnd} />
          )}

          {currentTab === "movements" && transactions.length === 0 && (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-slate-500 font-medium">
                Aínda non tes movementos rexistrados.
              </p>
              <button
                onClick={() => setCurrentTab("import")}
                className="mt-4 text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer"
              >
                Ir á pestana de Importación
              </button>
            </div>
          )}

          {currentTab === "movements" && transactions.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  interface BankTotal {
                    bankName: string;
                    total: number;
                  }

                  const bankMap = transactions.reduce(
                    (acc, tx) => {
                      let bankName = "Sen banco asociado";
                      if (tx.accountId) {
                        const ab = accountBalances.find(
                          (a) =>
                            a.accountId === tx.accountId ||
                            a.iban === tx.accountId,
                        );
                        if (ab && ab.bankName) {
                          bankName = ab.bankName;
                        } else if (
                          tx.accountId.startsWith("ES") &&
                          tx.accountId.length >= 15
                        ) {
                          bankName = getBankNameFromIBAN(tx.accountId);
                        } else {
                          bankName = `Conta ${tx.accountId.substring(0, 8)}...`;
                        }
                      }
                      if (!acc[bankName])
                        acc[bankName] = { bankName, total: 0 };
                      acc[bankName].total += tx.amount;
                      return acc;
                    },
                    {} as Record<string, BankTotal>,
                  );

                  const banks = Object.values(bankMap).sort(
                    (a, b) => b.total - a.total,
                  );

                  return (
                    <>
                      {banks.map((bank) => (
                        <div
                          key={bank.bankName}
                          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between items-start"
                        >
                          <div className="w-full">
                            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                              Cartos dispoñibles ({bank.bankName})
                            </h2>
                            <div className="text-4xl font-bold text-slate-900 mb-4">
                              {new Intl.NumberFormat("gl-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(bank.total)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {banks.length > 1 && (
                        <div className="bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-800 flex flex-col justify-between items-start text-white">
                          <div className="w-full">
                            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                              Cartos dispoñibles (Total)
                            </h2>
                            <div className="text-4xl font-bold text-white">
                              {new Intl.NumberFormat("gl-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(
                                banks.reduce((acc, b) => acc + b.total, 0),
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-slate-100 gap-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Movementos
                  </h2>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="Buscar movementos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-4 py-1.5 text-sm font-medium bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 rounded-full text-slate-700"
                      />
                    </div>
                    <button
                      onClick={toggleAllMonths}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors hidden sm:inline-block whitespace-nowrap cursor-pointer"
                    >
                      {allCollapsed ? "Ampliar todo" : "Reducir todo"}
                    </button>
                    <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full whitespace-nowrap">
                      {filteredTransactions.length} movementos
                    </div>
                  </div>
                </div>

                <div className="sm:hidden mb-6 flex justify-end">
                  <button
                    onClick={toggleAllMonths}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    {allCollapsed ? "Ampliar todo" : "Reducir todo"}
                  </button>
                </div>

                <div className="space-y-8">
                  {sortedMonths.map((monthStr) => (
                    <MonthGroup
                      key={monthStr}
                      monthStr={monthStr}
                      transactions={groupedTransactions[monthStr]}
                      isExpanded={!collapsedMonths.has(monthStr)}
                      onToggle={() => toggleMonth(monthStr)}
                      onUpdateCategory={handleUpdateCategory}
                      onUpdateSuperCategory={handleUpdateSuperCategory}
                      onUpdateReceipt={handleUpdateReceipt}
                      availableCategories={availableCategories}
                      availableSuperCategories={availableSuperCategories}
                      accountBalances={accountBalances}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentTab === "categories" && (
            <div className="space-y-6 pt-6">
              <CategoriesManager
                transactions={transactions}
                availableCategories={availableCategories}
                setTransactions={setTransactions}
                onUpdateCategory={handleUpdateCategory}
              />
            </div>
          )}

          {currentTab === "import" && (
            <div className="max-w-md mx-auto space-y-8 pt-8">
              {loading && (
                <p className="text-slate-500 text-sm mb-4 text-center">
                  Actualizando...
                </p>
              )}
              <EnableBankingConnectButton
                onTransactionsFetched={(txs) => setTransactions(txs)}
                onAccountsFetched={(accs) => setAccountBalances(accs)}
                loading={loading}
                setLoadingTransactions={setLoadingTransactions}
                existingTransactions={transactions}
              />

              {appError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-start space-x-3 border border-red-100 mb-4 text-left">
                  <AlertCircle className="shrink-0 mt-0.5" size={20} />
                  <p className="text-sm font-medium">{appError}</p>
                </div>
              )}

              {(transactions.length > 0 || accountBalances.length > 0) && (
                <div className="mt-8 pt-8 border-t border-slate-100 text-center space-y-4">
                  {isConfirmingDelete ? (
                    <div className="flex flex-col items-center space-y-3 bg-red-50 p-4 rounded-2xl border border-red-100">
                      <p className="text-sm text-red-700 font-medium whitespace-pre-wrap">
                        Estás seguro de que queres borrar todo o teu histórico?
                        Esta acción non se pode desfacer.
                      </p>
                      <div className="flex space-x-4">
                        <button
                          onClick={handleDeleteHistory}
                          disabled={loading}
                          className="text-sm bg-red-600 text-white hover:bg-red-700 transition-colors font-medium rounded-full px-4 py-2 disabled:opacity-50 cursor-pointer"
                        >
                          Si, borrar todo
                        </button>
                        <button
                          onClick={() => setIsConfirmingDelete(false)}
                          disabled={loading}
                          className="text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors font-medium rounded-full px-4 py-2 disabled:opacity-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      disabled={loading}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium border border-transparent hover:border-red-100 hover:bg-red-50 rounded-full px-4 py-2 disabled:opacity-50 block w-full sm:w-auto mx-auto cursor-pointer"
                    >
                      Borrar histórico de datos
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {currentTab === "insights" && (
            <div className="space-y-6">
              <InsightsManager transactions={transactions} />
            </div>
          )}
        </div>
      )}

      {categoryUpdateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Actualizar categoría
            </h3>
            <p className="text-slate-600 mb-6">
              Estás a piques de clasificar o movemento "
              {categoryUpdateDialog.txName}" como{" "}
              <span className="font-semibold text-slate-800">
                {categoryUpdateDialog.newCategory}
              </span>
              .
            </p>

            <div className="space-y-4">
              {categoryUpdateDialog.similarCount > 0 && (
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      id="dialogUpdateAllCheck"
                      defaultChecked
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    Aplicar tamén aos {categoryUpdateDialog.similarCount}{" "}
                    movementos similares no historial.
                  </span>
                </label>
              )}

              {categoryUpdateDialog.showSystemLearn && (
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      id="dialogTeachSystemCheck"
                      defaultChecked
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    Ensinar ao sistema para aplicar automaticamente esta
                    categoría a futuros movementos desta descrición.
                  </span>
                </label>
              )}
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => {
                  const updateAll =
                    categoryUpdateDialog.similarCount > 0
                      ? (
                          document.getElementById(
                            "dialogUpdateAllCheck",
                          ) as HTMLInputElement
                        )?.checked
                      : false;
                  const teachSystem = categoryUpdateDialog.showSystemLearn
                    ? (
                        document.getElementById(
                          "dialogTeachSystemCheck",
                        ) as HTMLInputElement
                      )?.checked
                    : false;
                  executeCategoryUpdate(updateAll, teachSystem);
                }}
                className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-colors"
              >
                Aplicar
              </button>
              <button
                onClick={() => setCategoryUpdateDialog(null)}
                className="flex-1 bg-white text-slate-700 rounded-xl py-3 font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {superCategoryUpdateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Actualizar supercategoría
            </h3>
            <p className="text-slate-600 mb-6">
              Estás a piques de agrupar o movemento "
              {superCategoryUpdateDialog.txName}" en{" "}
              <span className="font-semibold text-slate-800">
                {superCategoryUpdateDialog.newSuperCategory}
              </span>
              .
            </p>

            <div className="space-y-4">
              {superCategoryUpdateDialog.similarCount > 0 && (
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      id="dialogUpdateAllSuperCheck"
                      defaultChecked
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    Aplicar tamén aos {superCategoryUpdateDialog.similarCount}{" "}
                    movementos similares no historial.
                  </span>
                </label>
              )}

              {superCategoryUpdateDialog.showSystemLearn && (
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      id="dialogTeachSystemSuperCheck"
                      defaultChecked
                      className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    Ensinar ao sistema para aplicar automaticamente esta
                    supercategoría a futuros movementos desta descrición.
                  </span>
                </label>
              )}
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => {
                  const updateAll =
                    superCategoryUpdateDialog.similarCount > 0
                      ? (
                          document.getElementById(
                            "dialogUpdateAllSuperCheck",
                          ) as HTMLInputElement
                        )?.checked
                      : false;
                  const teachSystem = superCategoryUpdateDialog.showSystemLearn
                    ? (
                        document.getElementById(
                          "dialogTeachSystemSuperCheck",
                        ) as HTMLInputElement
                      )?.checked
                    : false;
                  executeSuperCategoryUpdate(updateAll, teachSystem);
                }}
                className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-colors"
              >
                Aplicar
              </button>
              <button
                onClick={() => setSuperCategoryUpdateDialog(null)}
                className="flex-1 bg-white text-slate-700 rounded-xl py-3 font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4 mx-auto text-slate-600">
              <Settings size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Configuración</h3>
            <p className="text-slate-500 text-sm mb-6 text-center">
              Personaliza a túa experiencia.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSaveSettings}
                className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-colors flex justify-center flex-row items-center cursor-pointer gap-2"
              >
                Gardar
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 bg-white text-slate-700 rounded-xl py-3 font-medium border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer text with links */}
      <footer className="mt-16 text-center text-sm text-slate-400 space-x-4">
        <span>&copy; {new Date().getFullYear()} A vaca polo que vale</span>
        <a href="/privacy" className="hover:text-slate-600 transition-colors">
          Política de Privacidade
        </a>
        <a href="/terms" className="hover:text-slate-600 transition-colors">
          Termos de Uso
        </a>
      </footer>
    </div>
  );
}

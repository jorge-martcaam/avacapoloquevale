import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  Landmark,
  AlertCircle,
  Loader2,
  LogOut,
  ChevronDown,
  Calendar,
  Search,
 
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
  learnCategory,
  updateTransactionReceipt,
} from "./lib/firestore";
import AuthScreen from "./components/AuthScreen";
import { Overview } from "./Overview";
import { CategoriesManager } from "./CategoriesManager";


export const PREDEFINED_CATEGORIES = [
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

export const PREDEFINED_SUPERCATEGORIES = [
  "Ingresos",
  "Fogar e Vivenda",
  "Alimentación",
  "Transporte",
  "Saúde e Coidado Persoal",
  "Ocio e Tempo Libre",
  "Obrigas e Gastos Financeiros",
  "Aforro e Investimento",
];

export const getBankNameFromIBAN = (iban: string) => {
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();
  const espBanks: Record<string, string> = {
    "2080": "Abanca",
    "0049": "Santander",
    "0073": "Openbank",
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
    "1583": "Caixa Rural Galega",
    "3058": "Cajamar",
    "0240": "Revolut",
    "1491": "Triodos Bank",
    "3035": "Laboral Kutxa",
    "1550": "Pibank",
    "0083": "Banco Pichincha",
    "0238": "Banco Pastor",
    "0075": "Banco Popular",
    "0061": "Banca March",
  };

  if (cleanIban.startsWith("ES") && cleanIban.length >= 8) {
    const entityCode = cleanIban.substring(4, 8);
    return espBanks[entityCode] || "Banco";
  } else if (/^\d{20}$/.test(cleanIban)) {
    const entityCode = cleanIban.substring(0, 4);
    return espBanks[entityCode] || "Banco";
  }
  return "Conta";
};

export const getBankNameForTx = (tx: any, accountBalances: any[] = []) => {
  const accId = tx.accountId || tx.account_id;
  if (accId) {
    const balanceInfo = (accountBalances || []).find(
      (a) => a.accountId === accId || a.iban === accId || a.id === accId,
    );
    if (balanceInfo) {
      if (
        balanceInfo.bankName &&
        balanceInfo.bankName.trim() !== "" &&
        balanceInfo.bankName !== "Conta" &&
        balanceInfo.bankName !== "Banco" &&
        balanceInfo.bankName !== "Sen banco asociado"
      ) {
        return balanceInfo.bankName;
      }
      if (balanceInfo.iban && balanceInfo.iban.length >= 8) {
        const nameFromIban = getBankNameFromIBAN(balanceInfo.iban);
        if (nameFromIban && nameFromIban !== "Conta" && nameFromIban !== "Banco") {
          return nameFromIban;
        }
      }
      if (balanceInfo.name) {
        const n = balanceInfo.name.toUpperCase();
        if (n.includes("OPEN")) return "Openbank";
        if (n.includes("ABANCA")) return "Abanca";
        if (n.includes("SANTANDER")) return "Santander";
        if (n.includes("BBVA")) return "BBVA";
        if (n.includes("CAIXA") || n.includes("LA CAIXA")) return "CaixaBank";
        if (n.includes("RURAL")) return "Caixa Rural Galega";
        if (n.includes("REVOLUT")) return "Revolut";
        if (n.includes("ING")) return "ING Banco";
        if (n.includes("SABADELL")) return "Sabadell";
        if (n.includes("BANKINTER")) return "Bankinter";
      }
    }

    if (typeof accId === "string") {
      const clean = accId.replace(/\s/g, "").toUpperCase();
      if (clean.startsWith("ES") && clean.length >= 8) {
        const name = getBankNameFromIBAN(clean);
        if (name !== "Conta" && name !== "Banco") return name;
      }
    }

    // Direct resolution for Enable Banking session UUIDs
    if (
      accId === "0e376454-a9a1-4992-a374-57356f972395" ||
      accId === "7f2cbcb7-f5e6-444c-9c21-91dcef26f620"
    ) {
      return "Openbank";
    }
    if (accId === "5c1ee2da-0ec0-49e3-84ea-bf6c50e9b60c") {
      return "Caixa Rural Galega";
    }
    if (
      accId === "be966bd9-0d3a-4753-9560-603bbd46bce4" ||
      accId === "74f3c7e6-a276-452e-a18b-9bce9e691973"
    ) {
      return "Abanca";
    }
  }
  return "Sen banco asociado";
};

export const getUniqueAccountBalances = (accountBalances: any[]) => {
  const uniqueAccountsMap = new Map<string, any>();
  for (const acc of accountBalances) {
    const key = acc.iban && acc.iban.length > 5 ? acc.iban : acc.accountId;
    const existing = uniqueAccountsMap.get(key);
    if (!existing) {
      uniqueAccountsMap.set(key, acc);
    } else {
      const existingBal =
        typeof existing.balance === "number"
          ? existing.balance
          : parseFloat(String(existing.balance || 0)) || 0;
      const newBal =
        typeof acc.balance === "number"
          ? acc.balance
          : parseFloat(String(acc.balance || 0)) || 0;
      const existingHasValidBank =
        existing.bankName &&
        existing.bankName !== "Sen banco asociado" &&
        existing.bankName !== "Banco" &&
        existing.bankName !== "Conta";
      const newHasValidBank =
        acc.bankName &&
        acc.bankName !== "Sen banco asociado" &&
        acc.bankName !== "Banco" &&
        acc.bankName !== "Conta";

      uniqueAccountsMap.set(key, {
        ...existing,
        ...acc,
        balance: newBal !== 0 ? newBal : existingBal,
        bankName: newHasValidBank
          ? acc.bankName
          : existingHasValidBank
            ? existing.bankName
            : acc.bankName || existing.bankName,
        iban: acc.iban || existing.iban,
      });
    }
  }
  return Array.from(uniqueAccountsMap.values());
};

export const normalizeAccountBalances = (accs: AccountBalance[] = []) => {
  return (accs || []).map((acc) => {
    if (
      acc.bankName &&
      acc.bankName.trim() !== "" &&
      acc.bankName !== "Conta" &&
      acc.bankName !== "Banco" &&
      acc.bankName !== "Sen banco asociado"
    ) {
      return acc;
    }
    let derived = "";
    if (acc.iban) {
      derived = getBankNameFromIBAN(acc.iban);
    }
    if (!derived || derived === "Conta" || derived === "Banco") {
      if (
        acc.accountId === "0e376454-a9a1-4992-a374-57356f972395" ||
        acc.accountId === "7f2cbcb7-f5e6-444c-9c21-91dcef26f620"
      ) {
        derived = "Openbank";
      } else if (acc.accountId === "5c1ee2da-0ec0-49e3-84ea-bf6c50e9b60c") {
        derived = "Caixa Rural Galega";
      } else if (
        acc.accountId === "be966bd9-0d3a-4753-9560-603bbd46bce4" ||
        acc.accountId === "74f3c7e6-a276-452e-a18b-9bce9e691973"
      ) {
        derived = "Abanca";
      }
    }
    if (!derived || derived === "Conta" || derived === "Banco") {
      if (acc.name) {
        const n = acc.name.toUpperCase();
        if (n.includes("ABANCA")) derived = "Abanca";
        else if (n.includes("OPEN")) derived = "Openbank";
        else if (n.includes("RURAL")) derived = "Caixa Rural Galega";
        else if (n.includes("SANTANDER")) derived = "Santander";
        else if (n.includes("BBVA")) derived = "BBVA";
        else if (n.includes("CAIXA") || n.includes("LA CAIXA")) derived = "CaixaBank";
        else if (n.includes("REVOLUT")) derived = "Revolut";
      }
    }
    return {
      ...acc,
      bankName: derived || acc.bankName || "Sen banco asociado",
    };
  });
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
      const personalMethod = aspspObj.auth_methods?.find(
        (m: any) => m.psu_type === "personal",
      );
      const response = await fetch("/api/enablebanking/start_auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uri,
          aspsp: { name: aspspObj.name, country: aspspObj.country },
          psu_type: "personal",
          auth_method: personalMethod?.name || undefined,
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

            if (txs.length > 0) {
              await saveTransactionsToFirestore(txs);
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
                  const b = acc.balances[0];
                  const bal = b.balance_amount || b.balanceAmount || b.amount || (typeof b === "object" ? b : {});
                  if (bal && bal.amount !== undefined) {
                    balNum = Number(bal.amount);
                    curr = bal.currency || curr;
                  } else if (typeof b === "number") {
                    balNum = Number(b);
                  } else if (b.amount !== undefined) {
                    balNum = Number(b.amount);
                    curr = b.currency || curr;
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

                let bName =
                  acc.bankName ||
                  acc.aspsp?.name ||
                  selectedBank?.name ||
                  selectedAspsp.split(":::")[0] ||
                  "";
                if (
                  !bName ||
                  bName === "Banco" ||
                  bName === "Conta" ||
                  bName === "Sen banco asociado"
                ) {
                  if (iban) {
                    bName = getBankNameFromIBAN(iban);
                  }
                }
                if (
                  !bName ||
                  bName === "Banco" ||
                  bName === "Conta" ||
                  bName === "Sen banco asociado"
                ) {
                  if (
                    id === "be966bd9-0d3a-4753-9560-603bbd46bce4" ||
                    id === "74f3c7e6-a276-452e-a18b-9bce9e691973"
                  ) {
                    bName = "Abanca";
                  }
                }

                return {
                  accountId: id,
                  name: name,
                  balance: balNum,
                  currency: curr,
                  iban: iban,
                  bankName: bName,
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

                  // Persist account balances to Firestore right away so balances are always saved
                  const accountsToSave = accs.map((acc: any) => {
                    const id = acc.uid || acc.account_id?.iban || acc.id;
                    const name =
                      acc.name || acc.product || acc.account_id?.iban || id;
                    let balNum = 0;
                    let curr = acc.currency || "EUR";
                    if (acc.balances && acc.balances.length > 0) {
                      const b = acc.balances[0];
                      const bal =
                        b.balance_amount ||
                        b.balanceAmount ||
                        b.amount ||
                        (typeof b === "object" ? b : {});
                      if (bal && bal.amount !== undefined) {
                        balNum = Number(bal.amount);
                        curr = bal.currency || curr;
                      } else if (typeof b === "number") {
                        balNum = Number(b);
                      } else if (b.amount !== undefined) {
                        balNum = Number(b.amount);
                        curr = b.currency || curr;
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

                    let bName =
                      acc.bankName ||
                      acc.aspsp?.name ||
                      selectedBank?.name ||
                      selectedAspsp.split(":::")[0] ||
                      "";
                    if (
                      !bName ||
                      bName === "Banco" ||
                      bName === "Conta" ||
                      bName === "Sen banco asociado"
                    ) {
                      if (iban) {
                        bName = getBankNameFromIBAN(iban);
                      }
                    }
                    if (
                      !bName ||
                      bName === "Banco" ||
                      bName === "Conta" ||
                      bName === "Sen banco asociado"
                    ) {
                      if (
                        id === "be966bd9-0d3a-4753-9560-603bbd46bce4" ||
                        id === "74f3c7e6-a276-452e-a18b-9bce9e691973"
                      ) {
                        bName = "Abanca";
                      }
                    }

                    return {
                      accountId: id,
                      name: name,
                      balance: balNum,
                      currency: curr,
                      iban: iban,
                      bankName: bName,
                    };
                  });

                  if (accountsToSave.length > 0) {
                    await saveAccountsToFirestore(accountsToSave);
                    const allAccs = await getAccountsFromFirestore();
                    onAccountsFetched(allAccs);
                  }

                  setStep(2);
                } else {
                  const debugInfo = data.debug?.sessionData 
                    ? ` (Estado sesión: ${data.debug?.status || "sen estado"}, Contas detectadas: ${data.debug?.rawAccountsCount ?? 0})` 
                    : "";
                  setErrorMsg(`Non se atoparon contas nesta entidade bancaria.${debugInfo}`);
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

  const selectedBank = aspsps.find((a) => `${a.name}:::${a.country}` === selectedAspsp);

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
              const b = acc.balances[0];
              const bal = b.balance_amount || b.balanceAmount || b.amount || (typeof b === "object" ? b : {});
              if (bal && bal.amount !== undefined) {
                balanceStr = `${bal.amount} ${bal.currency || acc.currency || "EUR"}`;
              } else if (typeof b === "number") {
                balanceStr = `${b} ${acc.currency || "EUR"}`;
              } else if (b.amount !== undefined) {
                balanceStr = `${b.amount} ${b.currency || acc.currency || "EUR"}`;
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
              .sort((a, b) => a.name.localeCompare(b.name, 'gl'))
              .map((aspsp, i) => (
                <option key={i} value={`${aspsp.name}:::${aspsp.country}`}>
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
  const [selectedBankFilter, setSelectedBankFilter] = useState<string | null>(
    null,
  );
  const [currentTab, setCurrentTab] = useState<
    "overview" | "movements" | "categories" | "import"
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
  const [customCategoriesMap, setCustomCategoriesMap] = useState<Record<string, string>>({});
  const [customSuperCategories, setCustomSuperCategories] = useState<string[]>([]);

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
          if (profile && profile.customCategoriesMap) {
            setCustomCategoriesMap(profile.customCategoriesMap);
          }
          if (profile && profile.customSuperCategories) {
            setCustomSuperCategories(profile.customSuperCategories);
          }
        } catch (e) {
          // ignore
        }
        try {
          const txs = await getTransactionsFromFirestore();
          setTransactions(txs);
          const accs = await getAccountsFromFirestore();
          setAccountBalances(normalizeAccountBalances(accs));
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
    if (selectedBankFilter) {
      const bank = getBankNameForTx(tx, accountBalances);
      if (bank !== selectedBankFilter) return false;
    }
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
      ...Object.keys(customCategoriesMap),
      ...(transactions.map((tx) => tx.category).filter(Boolean) as string[]),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const availableSuperCategories = Array.from(
    new Set([
      ...PREDEFINED_SUPERCATEGORIES,
      ...customSuperCategories,
      ...Object.values(customCategoriesMap),
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
              onClick={() => setCurrentTab("movements")}
              className={`pb-4 text-sm font-bold transition-colors cursor-pointer ${
                currentTab === "movements"
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700 border-b-2 border-transparent"
              }`}
            >
              Movementos
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
          </div>

          {currentTab === "overview" && (
            <Overview transactions={transactions} userPaydayStart={userPaydayStart} userPaydayEnd={userPaydayEnd} />
          )}

          {currentTab === "movements" &&
            transactions.length === 0 &&
            accountBalances.length === 0 && (
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

          {currentTab === "movements" &&
            (transactions.length > 0 || accountBalances.length > 0) && (
              <div className="space-y-6">
              {(() => {
                const uniqueAccs = getUniqueAccountBalances(accountBalances);

                // Map official balances per bank from unique accounts
                const bankBalanceMap: Record<string, number> = {};
                for (const acc of uniqueAccs) {
                  const bName = acc.bankName || "Sen banco asociado";
                  const bal =
                    typeof acc.balance === "number"
                      ? acc.balance
                      : parseFloat(String(acc.balance || 0)) || 0;
                  bankBalanceMap[bName] = (bankBalanceMap[bName] || 0) + bal;
                }

                // Detect all banks present in transactions
                const banksInTransactions = new Set<string>();
                for (const tx of transactions) {
                  banksInTransactions.add(getBankNameForTx(tx, accountBalances));
                }

                // Gather distinct bank names (from transactions and accounts)
                const allBankNames = Array.from(
                  new Set([
                    ...Array.from(banksInTransactions),
                    ...Object.keys(bankBalanceMap),
                  ]),
                ).filter((name) => {
                  if (!name) return false;
                  if (name === "Sen banco asociado") {
                    return (
                      banksInTransactions.has(name) ||
                      (bankBalanceMap[name] || 0) !== 0
                    );
                  }
                  return true;
                });

                const banks = allBankNames
                  .map((bankName) => {
                    const hasOfficialBalance =
                      bankBalanceMap[bankName] !== undefined;
                    const balance = hasOfficialBalance
                      ? bankBalanceMap[bankName]
                      : transactions
                          .filter(
                            (tx) =>
                              getBankNameForTx(tx, accountBalances) ===
                              bankName,
                          )
                          .reduce((sum, tx) => sum + (tx.amount || 0), 0);

                    return {
                      bankName,
                      total: balance,
                    };
                  })
                  .sort((a, b) => b.total - a.total);

                const grandTotal =
                  Object.keys(bankBalanceMap).length > 0
                    ? Object.values(bankBalanceMap).reduce(
                        (acc, val) => acc + val,
                        0,
                      )
                    : banks.reduce((acc, b) => acc + b.total, 0);

                return (
                  <div className="flex flex-col md:flex-row items-stretch gap-6 w-full">
                    {banks.map((bank) => {
                      const isSelected = selectedBankFilter === bank.bankName;
                      return (
                        <div
                          key={bank.bankName}
                          onClick={() =>
                            setSelectedBankFilter((prev) =>
                              prev === bank.bankName ? null : bank.bankName,
                            )
                          }
                          className={`flex-1 min-w-0 p-6 sm:p-7 rounded-3xl shadow-sm border transition-all cursor-pointer flex flex-col justify-between select-none ${
                            isSelected
                              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-md"
                              : selectedBankFilter
                                ? "bg-white/60 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300"
                                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-md"
                          }`}
                        >
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-2">
                              <h2
                                className={`text-xs sm:text-sm font-semibold uppercase tracking-wider truncate ${
                                  isSelected
                                    ? "text-blue-700"
                                    : "text-slate-500"
                                }`}
                                title={bank.bankName}
                              >
                                {bank.bankName}
                              </h2>
                              {isSelected && (
                                <span className="text-xs bg-blue-600 text-white font-medium px-2 py-0.5 rounded-full">
                                  Filtrado
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight whitespace-nowrap ${
                                isSelected ? "text-blue-900" : "text-slate-900"
                              }`}
                            >
                              {new Intl.NumberFormat("gl-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(bank.total)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onClick={() => setSelectedBankFilter(null)}
                      className={`flex-1 min-w-0 p-6 sm:p-7 rounded-3xl shadow-sm border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        !selectedBankFilter
                          ? "bg-slate-900 border-slate-800 ring-2 ring-slate-900 text-white shadow-md"
                          : "bg-slate-800 border-slate-700 text-slate-300 opacity-75 hover:opacity-100 hover:text-white"
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <h2
                            className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2"
                          >
                            Cartos totais
                          </h2>
                          {!selectedBankFilter && (
                            <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-full border border-slate-700">
                              Todos
                            </span>
                          )}
                        </div>
                        <div className="text-2xl sm:text-3xl xl:text-4xl font-bold text-white tracking-tight whitespace-nowrap">
                          {new Intl.NumberFormat("gl-ES", {
                            style: "currency",
                            currency: "EUR",
                          }).format(grandTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {transactions.length > 0 ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-slate-100 gap-4">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    {selectedBankFilter
                      ? `Movementos de ${selectedBankFilter}`
                      : "Movementos"}
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
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center py-12 space-y-3">
                <p className="text-slate-500 font-medium">
                  Contas bancarias sincronizadas con saldo oficial. Aínda non hai movementos cargados para estas contas.
                </p>
                <button
                  onClick={() => setCurrentTab("import")}
                  className="text-blue-600 hover:text-blue-700 font-bold text-sm cursor-pointer"
                >
                  Ir á pestana de Importación para sincronizar movementos
                </button>
              </div>
            )}
          </div>
        )}

          {currentTab === "categories" && (
            <div className="space-y-6 pt-6">
              <CategoriesManager
                transactions={transactions}
                availableCategories={availableCategories}
                availableSuperCategories={availableSuperCategories}
                customCategoriesMap={customCategoriesMap}
                customSuperCategories={customSuperCategories}
                setCustomCategoriesMap={setCustomCategoriesMap}
                setCustomSuperCategories={setCustomSuperCategories}
                setTransactions={setTransactions}
                onUpdateCategory={handleUpdateCategory}
                onUpdateSuperCategory={handleUpdateSuperCategory}
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
                onAccountsFetched={(accs) =>
                  setAccountBalances(normalizeAccountBalances(accs))
                }
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

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
  where,
  deleteField,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "./firebase";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AccountBalance {
  accountId: string;
  userId: string;
  name: string;
  balance: number;
  currency: string;
  iban?: string;
  bankName?: string;
}

export async function saveAccountsToFirestore(
  accounts: Omit<AccountBalance, "userId">[],
) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const batch = writeBatch(db);
  const path = `users/${user.uid}/accounts`;

  for (const a of accounts) {
    const safeAccountId = String(a.accountId || "").replace(/[/\\#?]/g, "_").trim().substring(0, 128) || `acc_${Date.now()}`;
    const docRef = doc(db, path, safeAccountId);
    batch.set(docRef, { ...a, accountId: safeAccountId, userId: user.uid }, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAccountsFromFirestore(): Promise<AccountBalance[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/accounts`;
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as AccountBalance);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
  return [];
}

export interface Transaction {
  transaction_id: string;
  userId: string;
  accountId?: string;
  name: string;
  amount: number;
  date: string;
  bookingDate?: string;
  valueDate?: string;
  category?: string;
  superCategory?: string;
  counterparty?: string;
  counterpartyIban?: string;
  mcc?: string;
  mccDescription?: string;
  receiptDetails?: {
    merchant: string;
    date: string;
    totalAmount: number;
    items?: { name: string; price: number }[];
  } | null;
}

export function sanitizeTransactionId(id: string): string {
  if (!id) return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return String(id).replace(/[/\\#?]/g, "_").trim().substring(0, 128);
}

export async function updateTransactionReceipt(
  transactionId: string,
  receiptData: any,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const safeId = sanitizeTransactionId(transactionId);
  const path = `users/${user.uid}/transactions`;
  const docRef = doc(db, path, safeId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, { receiptDetails: receiptData });
    return;
  }

  const q = query(
    collection(db, path),
    where("transaction_id", "==", transactionId),
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const matchedDocRef = snapshot.docs[0].ref;
    await updateDoc(matchedDocRef, { receiptDetails: receiptData });
  } else {
    throw new Error("Transaction not found");
  }
}

export async function learnCategory(
  name: string,
  category?: string,
  superCategory?: string,
) {
  const user = auth.currentUser;
  if (!user || !name) return;
  const safeNameBuffer = btoa(encodeURIComponent(name)).replace(/[/+=]/g, "_");
  const path = `users/${user.uid}/learned_categories/${safeNameBuffer}`;
  const docRef = doc(db, path);
  try {
    const data: any = { name };
    if (category) data.category = category;
    if (superCategory) data.superCategory = superCategory;
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[0-9]/g, "") // Eliminar números (datas, importes no nome)
    .replace(/[^\w\s\u00C0-\u017F]/gi, "") // Eliminar caracteres especiais
    .replace(/\s+/g, " ") // Colapsar espazos
    .trim();
};

export async function saveTransactionsToFirestore(
  transactions: Omit<Transaction, "userId">[],
) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const path = `users/${user.uid}/transactions`;

  try {
    // Basic auto-classification: fetch existing transactions
    // to build a map of previously used names to categories
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const categoryMap: Record<
      string,
      { category: string; superCategory?: string }
    > = {};
    const existingDocsMap = new Map<string, any>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      existingDocsMap.set(docSnap.id, data);
      if (data.transaction_id) {
        existingDocsMap.set(data.transaction_id, data);
      }
      if (
        data.name &&
        data.category &&
        data.category !== "Outros"
      ) {
        categoryMap[normalizeName(data.name)] = {
          category: data.category,
          superCategory: data.superCategory,
        };
      }
    });

    // Also read explicitly learned categories (these have priority)
    try {
      const learnedQ = query(
        collection(db, `users/${user.uid}/learned_categories`),
      );
      const learnedSnap = await getDocs(learnedQ);
      learnedSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name && data.category) {
          categoryMap[normalizeName(data.name)] = {
            category: data.category,
            superCategory: data.superCategory,
          };
        }
      });
    } catch (err) {
      console.warn("Could not load learned categories", err);
    }

    let currentBatch = writeBatch(db);
    let count = 0;

    for (const t of transactions) {
      const safeId = sanitizeTransactionId(t.transaction_id);
      const docRef = doc(db, path, safeId);

      const existing = existingDocsMap.get(safeId) || existingDocsMap.get(t.transaction_id);

      // Target category: check if we have a learned category
      const learned = categoryMap[normalizeName(t.name)];

      // Strictly extract only the allowed fields to avoid failing Firestore rules
      const dataToWrite: any = {
        transaction_id: safeId,
        userId: user.uid,
        name: String(t.name || "").substring(0, 1000),
        amount: Number(t.amount || 0),
        date: String(t.date || "").substring(0, 64),
      };
      if (t.accountId || (t as any).account_id) {
        dataToWrite.accountId = String(t.accountId || (t as any).account_id).substring(0, 256);
      }
      if (t.counterparty) {
        dataToWrite.counterparty = String(t.counterparty).substring(0, 500);
      }
      if (t.counterpartyIban) {
        dataToWrite.counterpartyIban = String(t.counterpartyIban).substring(0, 64);
      }
      if (t.bookingDate) {
        dataToWrite.bookingDate = String(t.bookingDate).substring(0, 64);
      }
      if (t.valueDate) {
        dataToWrite.valueDate = String(t.valueDate).substring(0, 64);
      }
      if (t.mcc) {
        dataToWrite.mcc = String(t.mcc).substring(0, 32);
      }
      if (t.mccDescription) {
        dataToWrite.mccDescription = String(t.mccDescription).substring(0, 500);
      }
      if ((t as any).status) {
        dataToWrite.status = String((t as any).status).substring(0, 64);
      }
      if ((t as any).currency) {
        dataToWrite.currency = String((t as any).currency).substring(0, 16);
      }

      // Preserve user-managed fields if transaction already exists
      if (existing) {
        if (existing.category) {
          dataToWrite.category = String(existing.category).substring(0, 128);
        }
        if (existing.superCategory) {
          dataToWrite.superCategory = String(existing.superCategory).substring(0, 128);
        }
        if (existing.notes) {
          dataToWrite.notes = String(existing.notes).substring(0, 1000);
        }
        if (existing.receiptDetails) {
          dataToWrite.receiptDetails = existing.receiptDetails;
        }
      } else {
        const finalCategory = learned?.category || t.category || "Outros";
        if (finalCategory) {
          dataToWrite.category = String(finalCategory).substring(0, 128);
        }
        const finalSuperCategory = learned?.superCategory || t.superCategory;
        if (finalSuperCategory) {
          dataToWrite.superCategory = String(finalSuperCategory).substring(0, 128);
        }
      }

      currentBatch.set(docRef, dataToWrite, { merge: true });
      count++;
      
      if (count >= 500) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await currentBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransactionSuperCategory(
  transaction_id: string,
  newSuperCategory: string,
) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const safeId = sanitizeTransactionId(transaction_id);
  const path = `users/${user.uid}/transactions`;
  const docRef = doc(db, path, safeId);

  try {
    const dataToWrite: any = {
      userId: user.uid,
      transaction_id: safeId,
      superCategory: newSuperCategory || "",
    };

    await setDoc(docRef, dataToWrite, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateTransactionCategory(
  transaction_id: string,
  newCategory: string,
) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const safeId = sanitizeTransactionId(transaction_id);
  const path = `users/${user.uid}/transactions`;
  const docRef = doc(db, path, safeId);

  try {
    const dataToWrite: any = {
      userId: user.uid,
      transaction_id: safeId,
      category: newCategory || "",
    };

    await setDoc(docRef, dataToWrite, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function assignSuperCategory(
  category: string,
  superCategory: string,
  oldSuperCategory?: string,
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const path = `users/${user.uid}/transactions`;
  const q = query(collection(db, path), where("category", "==", category));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  const updatedIds: string[] = [];

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const currentSuper = data.superCategory || "Sen clasificación superior";
    if (oldSuperCategory === undefined || currentSuper === oldSuperCategory) {
      batch.set(
        docSnap.ref,
        { superCategory: superCategory || "" },
        { merge: true },
      );
      updatedIds.push(docSnap.id);
    }
  });

  try {
    if (updatedIds.length > 0) {
      await batch.commit();
    }
    return updatedIds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

export async function renameCategory(
  oldCategory: string,
  newCategory: string,
  oldSuperCategory?: string,
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const path = `users/${user.uid}/transactions`;
  const q = query(collection(db, path), where("category", "==", oldCategory));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  const updatedIds: string[] = [];

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const currentSuper = data.superCategory || "Sen clasificación superior";
    if (oldSuperCategory === undefined || currentSuper === oldSuperCategory) {
      batch.set(docSnap.ref, { category: newCategory || "" }, { merge: true });
      updatedIds.push(docSnap.id);
    }
  });

  try {
    if (updatedIds.length > 0) {
      await batch.commit();
    }
    return updatedIds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

export async function updateTransactionsBySuperCategoryAndName(
  name: string,
  newSuperCategory: string,
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const path = `users/${user.uid}/transactions`;
  const q = query(collection(db, path), where("name", "==", name));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  const updatedIds: string[] = [];

  snapshot.docs.forEach((docSnap) => {
    batch.set(docSnap.ref, { superCategory: newSuperCategory || "" }, { merge: true });
    updatedIds.push(docSnap.id);
  });

  try {
    if (updatedIds.length > 0) {
      await batch.commit();
    }
    return updatedIds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

export async function updateTransactionsByCategoryAndName(
  name: string,
  newCategory: string,
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const path = `users/${user.uid}/transactions`;
  const q = query(collection(db, path), where("name", "==", name));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  const updatedIds: string[] = [];

  snapshot.docs.forEach((docSnap) => {
    batch.set(docSnap.ref, { category: newCategory || "" }, { merge: true });
    updatedIds.push(docSnap.id);
  });

  try {
    if (updatedIds.length > 0) {
      await batch.commit();
    }
    return updatedIds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

export async function bulkUpdateTransactionsByNames(
  names: string[],
  newCategory: string,
  newSuperCategory: string,
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  if (!names.length) return [];

  const path = `users/${user.uid}/transactions`;
  const updatedIds: string[] = [];

  try {
    // We chunk by 10 because 'in' query limit is 10
    for (let i = 0; i < names.length; i += 10) {
      const chunk = names.slice(i, i + 10);
      const q = query(collection(db, path), where("name", "in", chunk));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        const updateData: any = {};
        if (newCategory) updateData.category = newCategory;
        if (newSuperCategory) updateData.superCategory = newSuperCategory;

        if (Object.keys(updateData).length > 0) {
          batch.set(docSnap.ref, updateData, { merge: true });
        }
        updatedIds.push(docSnap.id);
      });
      if (updatedIds.length > 0) {
        await batch.commit();
      }
    }
    return updatedIds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

export async function getTransactionsFromFirestore(): Promise<Transaction[]> {
  const user = auth.currentUser;
  if (!user) {
    return [];
  }

  const path = `users/${user.uid}/transactions`;
  try {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
  return [];
}

export async function deleteAllUserTransactions() {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/transactions`;
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);
    
    // Firestore allows max 500 operations per batch
    const BATCH_SIZE = 500;
    const docs = querySnapshot.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAllLearnedCategories() {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/learned_categories`;
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);
    
    const BATCH_SIZE = 500;
    const docs = querySnapshot.docs;
    
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function autoClassifyCurrentTransactions() {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/transactions`;

  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const categoryMap: Record<
      string,
      { category: string; superCategory?: string }
    > = {};

    // First, build map from transactions that have valid categories
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data.name &&
        data.category &&
        data.category !== "Outros" &&
        data.category !== "Outros"
      ) {
        categoryMap[normalizeName(data.name)] = {
          category: data.category,
          superCategory: data.superCategory,
        };
      }
    });

    // Also read explicitly learned categories (these have priority)
    try {
      const learnedQ = query(
        collection(db, `users/${user.uid}/learned_categories`),
      );
      const learnedSnap = await getDocs(learnedQ);
      learnedSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name && data.category) {
          categoryMap[normalizeName(data.name)] = {
            category: data.category,
            superCategory: data.superCategory,
          };
        }
      });
    } catch (err) {
      console.warn("Could not load learned categories", err);
    }

    // Process in smaller batches due to Firestore limits
    const MAX_BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let batchCount = 0;
    let totalUpdated = 0;

    for (const docSnap of snapshot.docs) {
      const t = docSnap.data();
      const tName = normalizeName(t.name);
      let learned = categoryMap[tName];

      // If no exact match, try to find a learned rule that is contained within this name
      if (!learned) {
        let bestMatch = "";
        for (const key of Object.keys(categoryMap)) {
          // Solamente usaremos subcadenas si teñen máis de 4 letras para evitar falsos positivos
          if (key.length > 4 && tName.includes(key)) {
            if (key.length > bestMatch.length) {
              bestMatch = key;
              learned = categoryMap[key];
            }
          }
        }
      }

      // We apply auto classification if we have something learned
      // and it's different from the current category
      const needsUpdate =
        learned &&
        (t.category !== learned.category ||
          t.superCategory !== learned.superCategory);

      if (learned && needsUpdate) {
        batch.update(docSnap.ref, {
          category: learned.category,
          ...(learned.superCategory && {
            superCategory: learned.superCategory,
          }),
        });
        batchCount++;
        totalUpdated++;
      }

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return totalUpdated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetAllTransactionCategories() {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}/transactions`;
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);

    // Process in smaller batches due to Firestore limits (500 ops/batch max)
    const MAX_BATCH_SIZE = 400;
    for (let i = 0; i < querySnapshot.docs.length; i += MAX_BATCH_SIZE) {
      const batchDocs = querySnapshot.docs.slice(i, i + MAX_BATCH_SIZE);
      const batch = writeBatch(db);

      batchDocs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          category: deleteField(),
          superCategory: deleteField(),
        });
      });

      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createUserProfile() {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, path),
      {
        userId: user.uid,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    // Note: If user already exists, replacing it without merge will fail the create rule and standard update rule unless it matches existing perfectly.
    // It's better to just do merge: true and handle it in the rules. We fixed the rule.
  }
}

export async function getDismissedAlerts(): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const path = `users/${user.uid}`;
  try {
    const docSnap = await getDoc(doc(db, path));
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.dismissedAlerts || [];
    }
  } catch (error) {
    console.error("Error getting dismissed alerts", error);
  }
  return [];
}

export async function dismissInsightAlert(alertId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, path),
      {
        dismissedAlerts: arrayUnion(alertId),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error updating dismissed alerts", error);
  }
}

export async function getUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  const path = `users/${user.uid}`;
  try {
    const docSnap = await getDoc(doc(db, path));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Error getting user profile", error);
  }
  return null;
}

export async function updateUserPaydayRange(paydayStart: number, paydayEnd: number) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, path), { paydayStart, paydayEnd }, { merge: true });
  } catch (error) {
    console.error("Error updating user payday", error);
  }
}

export async function addCustomCategory(category: string, superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, path), { 
      customCategoriesMap: { [category]: superCategory } 
    }, { merge: true });
  } catch (error) {
    console.error("Error adding custom category", error);
  }
}

export async function addCustomSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, path), { 
      customSuperCategories: arrayUnion(superCategory) 
    }, { merge: true });
  } catch (error) {
    console.error("Error adding custom supercategory", error);
  }
}

export async function removeCustomCategory(category: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.customCategoriesMap && data.customCategoriesMap[category]) {
      const updatedMap = { ...data.customCategoriesMap };
      delete updatedMap[category];
      await updateDoc(docRef, { customCategoriesMap: updatedMap });
    }
  } catch (error) {
    console.error("Error removing custom category", error);
  }
}

export async function removeCustomSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await updateDoc(doc(db, path), { 
      customSuperCategories: arrayRemove(superCategory) 
    });
  } catch (error) {
    console.error("Error removing custom supercategory", error);
  }
}

export async function hideCategory(category: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, path), { 
      hiddenCategories: arrayUnion(category) 
    }, { merge: true });
  } catch (error) {
    console.error("Error hiding category", error);
  }
}

export async function hideSuperCategory(superCategory: string) {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, path), { 
      hiddenSuperCategories: arrayUnion(superCategory) 
    }, { merge: true });
  } catch (error) {
    console.error("Error hiding supercategory", error);
  }
}

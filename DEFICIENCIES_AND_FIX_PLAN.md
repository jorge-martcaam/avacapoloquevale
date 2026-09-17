# 📋 Vaca & Monorepo: Plan de Corrección de Deficiencias e Melloras

Este documento recolle todas as deficiencias, vulnerabilidades de seguridade, fallos de esquema en Firestore e problemas de arquitectura detectados no proxecto **Vaca** (`apps/vaca` / repositorio `avacapoloquevale`) e no monorepo **iapps**, xunto cun plan de acción estruturado por fases para a súa resolución.

---

## 📑 Índice de Deficiencias

1. [🚨 Seguridade e Xestión de Segredos (Prioridade Crítica)](#1--seguridade-e-xestión-de-segredos-prioridade-crítica)
2. [⚠️ Regras de Seguridade de Firestore e Incoherencias de Esquema](#2-️-regras-de-seguridade-de-firestore-e-incoherencias-de-esquema)
3. [🤖 Backend e Integración de IA (Gemini API)](#3--backend-e-integración-de-ia-gemini-api)
4. [🏷️ Sistema de Categorización e Clasificación Financeira](#4-️-sistema-de-categorización-e-clasificación-financeira)
5. [📦 Xestión Git, Submódulos e Hixiene do Repositorio](#5--xestión-git-submódulos-e-hixiene-do-repositorio)
6. [⚡ Rendemento do Frontend e Construción](#6--rendemento-do-frontend-e-construción)
7. [🗓️ Plan de Acción por Fases](#7-️-plan-de-acción-por-fases)

---

## 1. 🚨 Seguridade e Xestión de Segredos (Prioridade Crítica)

### 1.1. Clave privada RSA exposta no repositorio (`private.key` e `public.pem`)
* **Localización:** `apps/vaca/private.key`, `apps/vaca/public.pem`.
* **Descrición:** A clave RSA de 2048 bits usada para xerar e asinar os tokens JWT de EnableBanking atópase commitada na raíz do repositorio. Calquera persoa con acceso ao historial de Git ten acceso á identidade da aplicación bancaria.
* **Impacto:** Posibilidade de falsificación de tokens e acceso non autorizado ás APIs bancarias configuradas.
* **Corrección planificada:**
  1. Revogar e rexenerar o certificado/par de claves no panel de EnableBanking.
  2. Eliminar `private.key` e `public.pem` do control de versións de Git (`git rm --cached`).
  3. Engadir `*.key`, `*.pem`, `private.key`, `public.pem` a `.gitignore` en `apps/vaca`.
  4. Configurar a clave exclusivamente mediante a variable de contorno `ENABLEBANKING_PRIVATE_KEY` ou secret manager.

### 1.2. Vulnerabilidade CSRF no fluxo OAuth de EnableBanking (`state` estático)
* **Localización:** `apps/vaca/server.ts` (liña 123).
* **Descrición:** O parámetro `state` enviado á API de EnableBanking ten un valor fixo hardcoded:
  ```typescript
  state: "some-random-state-12345"
  ```
* **Impacto:** Anula por completo a protección contra ataques de Cross-Site Request Forgery (CSRF) durante a redirección de autorización bancaria.
* **Corrección planificada:**
  * Xerar un valor criptográfico único por sesión (p. ex. `crypto.randomUUID()`), gardalo temporalmente en sesión/cookie cifrada ou Firestore, e validar que o `state` retornado coincida antes de procesar o `code`.

### 1.3. Endpoint público de logs sen autenticación (`/api/enablebanking/debug_logs`)
* **Localización:** `apps/vaca/server.ts` (liñas 96–108).
* **Descrición:** O endpoint `GET /api/enablebanking/debug_logs` devolve o contido do ficheiro de depuración a calquera cliente sen esixir token de autenticación.
* **Impacto:** Exposición de códigos de autorización, IDs de sesión, saldos bancarios e datos persoais de transaccións.
* **Corrección planificada:**
  * Protexer o endpoint cun middleware de autenticación (verificando o token Firebase ID do usuario) ou desactivalo totalmente en contornas que non sexan de desenvolvemento local estrito (`NODE_ENV === 'development'`).

### 1.4. Ruta absoluta POSIX non compatible con Windows (`/tmp`)
* **Localización:** `apps/vaca/server.ts` (liñas 19 e 98).
* **Descrición:** Emprégase a ruta `/tmp/enablebanking_debug.log`. En contornas Windows isto resólvese como `C:\tmp\...`, producindo erros `ENOENT: no such file or directory` cando non existe dito cartafol.
* **Corrección planificada:**
  * Empregar o módulo nativo `os`:
    ```typescript
    import os from "os";
    const logPath = path.join(os.tmpdir(), "enablebanking_debug.log");
    ```

---

## 2. ⚠️ Regras de Seguridade de Firestore e Incoherencias de Esquema

### 2.1. Bloqueo de `hiddenCategories` e `hiddenSuperCategories` en `firestore.rules`
* **Localización:** `apps/vaca/firestore.rules` (liñas 69–70) vs `apps/vaca/src/lib/firestore.ts` (liñas 933–958).
* **Descrición:** As funcións `hideCategory()` e `hideSuperCategory()` actualizan os campos `hiddenCategories` e `hiddenSuperCategories` no documento `/users/{userId}`. Non obstante, a regra de actualización só permite:
  ```firestore
  incoming().diff(existing()).affectedKeys().hasOnly([
    'dismissedAlerts', 'paydayStart', 'paydayEnd', 'customCategoriesMap', 'customSuperCategories'
  ]);
  ```
* **Impacto:** Chamar a `hideCategory()` ou `hideSuperCategory()` remata en erro `PERMISSION_DENIED` de Firestore.
* **Corrección planificada:**
  * Actualizar `isValidUser` e a cláusula `affectedKeys()` en `firestore.rules` para incluír `hiddenCategories` e `hiddenSuperCategories`.

### 2.2. Discrepancia na lonxitude máxima de campos de transaccións
* **Localización:** `apps/vaca/src/lib/firestore.ts` vs `apps/vaca/firestore.rules`.
* **Descrición:** O código do cliente recorta campos con límites superiores aos que admite a regra de Firestore:
  | Campo | Límite no Cliente (`firestore.ts`) | Límite nas Regras (`firestore.rules`) |
  | :--- | :--- | :--- |
  | `name` | `substring(0, 1000)` | `size() <= 256` |
  | `date` | `substring(0, 64)` | `size() <= 32` |
  | `accountId` | `substring(0, 256)` | `size() <= 128` |
  | `counterparty` | `substring(0, 500)` | `size() <= 256` |
  | `counterpartyIban` | `substring(0, 128)` | `size() <= 64` |
  | `mccDescription` | `substring(0, 500)` | `size() <= 256` |
* **Impacto:** Calquera movemento bancario con concepto ou descrición longa (> 256 caracteres) fai fallar o commit por lotes completo.
* **Corrección planificada:**
  * Aliñar ambos ficheiros: ampliar as regras a tamaños razoables ou estandarizar o truncamento no cliente para coincidir coas regras.

### 2.3. Risco de sobrescritura do mapa de categorías personalizadas
* **Localización:** `apps/vaca/src/lib/firestore.ts` (liñas 875–886).
* **Descrición:**
  ```typescript
  await setDoc(doc(db, path), { 
    customCategoriesMap: { [category]: superCategory } 
  }, { merge: true });
  ```
  En Firestore, `setDoc(..., { merge: true })` cun obxecto aniñado sobrescribe o obxecto completo se non se usan `FieldPath` con puntos.
* **Impacto:** Ao engadir unha categoría nova pérdense as categorías gardadas previamente no mapa.
* **Corrección planificada:**
  * Empregar `updateDoc` con notación punto:
    ```typescript
    await updateDoc(doc(db, path), {
      [`customCategoriesMap.${category}`]: superCategory
    });
    ```

---

## 3. 🤖 Backend e Integración de IA (Gemini API)

### 3.1. Modelo Gemini inexistente en OCR de tickets
* **Localización:** `apps/vaca/server.ts` (liña 493).
* **Descrición:** Emprégase o identificador de modelo `"gemini-3.5-flash"`:
  ```typescript
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    ...
  });
  ```
* **Impacto:** Dito modelo non existe na API de Google GenAI, polo que calquera chamada a `/api/ocr-receipt` falla con erro 404 / 400 Bad Request.
* **Corrección planificada:**
  * Actualizar a un modelo válido e eficiente: `"gemini-2.5-flash"` ou `"gemini-2.0-flash"`.

---

## 4. 🏷️ Sistema de Categorización e Clasificación Financeira

### 4.1. Incoherencia de formato entre Backend e Frontend
* **Descrición:**
  * `server.ts` asigna categorías prefixadas con iconas emoji (`"🛒 Supermercados"`, `"🍽️ Restaurantes"`, `"🚗 Transporte e Gasolina"`, `"📦 Outros"`).
  * O frontend en `App.tsx` define `PREDEFINED_CATEGORIES` sen emojis (`"Supermercado"`, `"Restaurantes e Bares"`, `"Combustible"`, `"Outros"`).
* **Impacto:** Ruptura de comparacións directas, filtrado incorrecto no `CategoriesManager`, e duplicidade de categorías nos gráficos de resumo (`Overview`).
* **Corrección planificada:**
  * Desacoplar o identificador/código de categoría do seu emoji/etiqueta visual.
  * Ver proposta completa de arquitectura no documento de deseño de categorías.

---

## 5. 📦 Xestión Git, Submódulos e Hixiene do Repositorio

### 5.1. Falta do ficheiro `.gitmodules` no repositorio raíz `iapps`
* **Localización:** Raíz de `iapps`.
* **Descrición:** `apps/vaca` está rexistrado como modo git `160000` (submódulo/gitlink), pero non existe o ficheiro `.gitmodules` que define a súa URL de orixe nin a rama.
* **Impacto:** Calquera clonación con `git clone --recurse-submodules` ou execución de `git submodule status` falla con:
  ```text
  fatal: no submodule mapping found in .gitmodules for path 'apps/vaca'
  ```
* **Corrección planificada:**
  * Crear `.gitmodules` na raíz de `iapps`:
    ```ini
    [submodule "apps/vaca"]
        path = apps/vaca
        url = https://github.com/jorge-martcaam/avacapoloquevale.git
        branch = main
    ```

### 5.2. Falta de `.gitignore` propio en `apps/vaca`
* **Localización:** `apps/vaca/.gitignore`.
* **Descrición:** Como submódulo autónomo, non herda o `.gitignore` de `iapps`.
* **Impacto:** Ficheiros como `.env`, `dist/`, `node_modules/` e certificados privados foron commitados accidentalmente ao repo standalone.
* **Corrección planificada:**
  * Crear un `.gitignore` completo específico dentro de `apps/vaca`.

### 5.3. Acumulación de máis de 40 scripts temporais de parches
* **Localización:** Raíz de `apps/vaca` (`patch_*.cjs`, `fix_*.cjs`, `test_*.js`, `replace_*.cjs`, `update_*.cjs`).
* **Descrición:** Multitude de scripts usados durante refactorizacións manuais anteriores permanecen na raíz do proxecto.
* **Corrección planificada:**
  * Eliminar os scripts obsoletos ou trasladalos a un cartafol `tools/legacy_patches/`.

---

## 6. ⚡ Rendemento do Frontend e Construción

### 6.1. Bundle JavaScript monolítico (> 730 kB)
* **Localización:** `apps/vaca/vite.config.ts`.
* **Descrición:** Vite emite un aviso porque a biblioteca enteira (`recharts`, `firebase`, `lucide-react`) xérase nun único anaco (`dist/assets/index-*.js`), superando os 730 kB minificados.
* **Corrección planificada:**
  * Configurar `manualChunks` en `vite.config.ts` para separar `vendor-firebase`, `vendor-charts` e `vendor-react`.

---

## 7. 🗓️ Plan de Acción por Fases

| Fase | Ámbito | Accións Principais | Risco / Dificultade |
| :--- | :--- | :--- | :--- |
| **Fase 1: Seguridade Inmediata** | Segredos & APIs | 1. Eliminar `private.key` de Git e engadir `.gitignore` en `apps/vaca`.<br>2. Corrixir `state` CSRF en `server.ts`.<br>3. Corrixir ruta de logs (`os.tmpdir()`) e restrinxir `/api/enablebanking/debug_logs`. | Baixa / Urxente |
| **Fase 2: Integridade de Datos** | Firestore & Backend | 1. Engadir `hiddenCategories` e `hiddenSuperCategories` en `firestore.rules`.<br>2. Aliñar lonxitudes de campos de transaccións entre cliente e regras.<br>3. Corrixir modelo Gemini en `server.ts` (`gemini-2.5-flash`).<br>4. Evitar sobrescritura de mapa en `addCustomCategory`. | Media |
| **Fase 3: Repositorio & Hixiene** | Git & Limpeza | 1. Engadir `.gitmodules` en `iapps`.<br>2. Limpar os máis de 40 ficheiros `patch_*.cjs` e scripts soltos.<br>3. Configurar code-splitting en `vite.config.ts`. | Baixa |
| **Fase 4: Sistema de Categorías** | Arquitectura | 1. Implantar o novo sistema taxonómico de categorías (identificadores estables, tipo financeiro, grupo orzamentario 50/30/20 e iconas desacopladas).<br>2. Mellorar o motor de regras de auto-clasificación. | Media / Alta |


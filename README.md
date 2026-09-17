# 🐄 Vaca (A Vaca polo que Vale)

**Vaca** é unha aplicación web para o control, xestión e análise de gastos persoais con clasificación intelixente de transaccións, integración bancaria (EnableBanking), alertas de presuposto e xestión de categorías personalizadas.

---

## 🚀 Características Principais

- **Visualización e Análise de Gastos:** Vista xeral e desgloses por mes, categorías e supercategorías en gráficos interactivos.
- **Integración Bancaria (EnableBanking):** Conexión e sincronización directa de contas bancarias e transaccións.
- **Asistente de IA (Gemini AI):** Integración cos modelos Gemini (`@google/genai`) para análise financeira, consellos e visión de gastos.
- **Clasificación Intelixente & Aprendizaxe:** Clasificación automática de transaccións segundo patróns anteriores e descricións.
- **Xestión de Categorías Personalizadas:** Creación, edición, asignación de supercategorías e posibilidade de ocultar categorías ou supercategorías.
- **Edición Masiva:** Modificación rápida de múltiples transaccións mediante o modal de edición masiva (`MassEditModal`).
- **Configuración do Ciclo de Nómina:** Personalización dos días de cobro de nómina (`paydayStart` / `paydayEnd`) para calcular ciclos financeiros mensuais reais.
- **Alertas e Presupostos:** Control de teitos de gasto e descartes de alertas.
- **Autenticación e Seguridade:** Autenticación con Google e Email/Password en Firebase Auth e Firestore Database con regras de seguridade validadas por esquema.

---

## 🛠️ Tecnoloxías Utilizadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.
- **Backend & Server:** Express 5, Node.js (`server.ts`), `@google/genai`.
- **Base de Datos & Auth:** Firebase Authentication, Cloud Firestore (regras personalizadas e seguridade por esquema).
- **Integracións:** EnableBanking API.

---

## ⚙️ Instalación e Execución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Executar servidor e frontend en desenvolvemento:**
   ```bash
   npm run dev
   ```

3. **Compilar para produción:**
   ```bash
   npm run build
   ```

---

## 🔑 Configuración

A aplicación conéctase a un proxecto Firebase con **Authentication** e **Firestore Database** (con ID de base de datos personalizado). A configuración e claves danse en `firebase-applet-config.json` e `src/lib/firebase.ts`.


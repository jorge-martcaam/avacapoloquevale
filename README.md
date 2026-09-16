# 🐄 Vaca (A Vaca polo que Vale)

**Vaca** é unha aplicación web para o control, xestión e análise de gastos persoais con clasificación intelixente de transaccións, alertas de presuposto e xestión de categorías personalizadas.

---

## 🚀 Características Principais

- **Visualización de Gastos:** Vista xeral e desgloses por mes, categorías e supercategorías.
- **Clasificación Intelixente:** Aprendizaxe e clasificación automática de transaccións segundo descrición e patróns.
- **Xestión de Categorías Personalizadas:** Asignación e personalización de categorías e supercategorías de gasto.
- **Edición Masiva:** Modificación rápida de múltiples transaccións.
- **Alertas e Presupostos:** Control de teitos de gasto e configuración do rango de cobro de nómina.
- **Autenticación e Persistencia:** Integración segura con Firebase Auth e Cloud Firestore.

---

## 🛠️ Tecnoloxías Utilizadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend & Database:** Firebase Authentication, Cloud Firestore.
- **Runtime:** Node.js.

---

## ⚙️ Instalación e Execución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Executar en modo desenvolvemento:**
   ```bash
   npm run dev
   ```

3. **Compilar para produción:**
   ```bash
   npm run build
   ```

---

## 🔑 Configuración

A aplicación conéctase a un proxecto Firebase con **Authentication** e **Firestore Database** activos. As credenciais e configuración atópanse en `src/lib/firebase.ts`.

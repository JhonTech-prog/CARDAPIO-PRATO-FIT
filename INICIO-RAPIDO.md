# 🎯 GUIA RÁPIDO - 5 Minutos

## ⚡ Opção 1: Script Automático (Recomendado)

### Passo Único:
```powershell
cd C:\Users\pc\Downloads\pratofit---cardápio-digital-premium
.\setup-whatsapp-local.ps1
```

**O script faz tudo automaticamente:**
- ✅ Cria pastas
- ✅ Clona repositórios
- ✅ Instala dependências
- ✅ Configura ambiente
- ✅ Aplica correções
- ✅ Cria atalhos de inicialização

---

## 🔥 Opção 2: Manual (Se o script falhar)

### 1️⃣ BACKUP (2 min)
```powershell
# Baixe MongoDB Compass: https://www.mongodb.com/try/download/compass
# Conecte: mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/
# Exporte collection "mensagens" → Salve como JSON
```

### 2️⃣ CLONAR (1 min)
```powershell
cd C:\Users\pc\Downloads
mkdir whatsapp-dev
cd whatsapp-dev
git clone https://github.com/JhonTech-prog/whatsapp.git backend
git clone https://github.com/JhonTech-prog/whats.git frontend
```

### 3️⃣ BACKEND (2 min)
```powershell
cd backend
npm install

# Criar .env com:
# META_ACCESS_TOKEN=seu_token
# MONGO_URI=mongodb://localhost:27017/whatsapp_local
# PORT=3000

# Copiar backend-corrigido-app.js para app.js
node app.js
```

### 4️⃣ FRONTEND (2 min) - NOVO TERMINAL
```powershell
cd C:\Users\pc\Downloads\whatsapp-dev\frontend
npm install

# Copiar frontend-corrigido-Inbox.tsx para pages/Inbox.tsx
npm run dev
```

### 5️⃣ TESTAR
```
Abrir: http://localhost:5173
Settings → Bridge URL: http://localhost:3000
```

---

## 🎮 Usando o Sistema Local

### Iniciar Servidores:
```powershell
cd C:\Users\pc\Downloads\whatsapp-dev
.\INICIAR-SERVIDORES.ps1
```

### URLs:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

---

## ✅ Quando Aprovar - Deploy Produção

### Deploy Seguro:
```powershell
# Backend
cd C:\Users\pc\Downloads\whatsapp-dev\backend
git checkout -b fix/media-support
git add app.js
git commit -m "fix: adicionar suporte a mídia"
git push origin fix/media-support

# Frontend
cd ..\frontend
git checkout -b fix/media-display
git add pages/Inbox.tsx
git commit -m "feat: exibir mídia"
git push origin fix/media-display
```

### No GitHub:
1. Criar Pull Request das branches
2. Revisar mudanças
3. Merge para `main` quando confirmar

### Rollback (se der problema):
```powershell
git revert HEAD
git push origin main
```

---

## 📂 Estrutura Criada

```
C:\Users\pc\Downloads\
├── whatsapp-dev/
│   ├── backend/              ← Backend local
│   ├── frontend/             ← Frontend local
│   ├── start-backend.ps1     ← Iniciar só backend
│   ├── start-frontend.ps1    ← Iniciar só frontend
│   └── INICIAR-SERVIDORES.ps1 ← Iniciar ambos
│
├── whatsapp-backups/         ← Backups do MongoDB
│   └── backup-2026-01-19.json
│
└── pratofit---cardápio-digital-premium/
    ├── SETUP-LOCAL-WHATSAPP.md
    ├── setup-whatsapp-local.ps1
    ├── backend-corrigido-app.js
    └── frontend-corrigido-Inbox.tsx
```

---

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "node não reconhecido" | Instalar Node.js: https://nodejs.org/ |
| "git não reconhecido" | Instalar Git: https://git-scm.com/download/win |
| Backend não inicia | Verificar se porta 3000 está livre |
| Frontend não conecta | Verificar se backend está rodando |
| MongoDB erro | Instalar MongoDB local ou usar Atlas separado |

---

## 🔒 IMPORTANTE

- ✅ Sistema LOCAL não afeta produção
- ✅ Banco de dados SEPARADO
- ✅ Conversas em produção INTACTAS
- ✅ Pode testar à vontade sem risco

---

## 📞 Suporte

Arquivos de referência:
- 📖 `SETUP-LOCAL-WHATSAPP.md` - Guia completo
- 📖 `CORRECOES-WHATSAPP.md` - Documentação técnica
- 📖 `GUIA-IMPLEMENTACAO.md` - Passo a passo

**Data:** 19/01/2026

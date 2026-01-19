# 🔒 SETUP LOCAL - WhatsApp (SEM AFETAR PRODUÇÃO)

## ⚠️ IMPORTANTE
Este guia configura um ambiente LOCAL para testar as correções SEM AFETAR o sistema em produção (pratofit.com.br)

---

## 📦 PASSO 1: Fazer Backup das Conversas (CRÍTICO)

### Opção 1: Backup via MongoDB Compass (Recomendado)

1. **Baixar MongoDB Compass:**
   - https://www.mongodb.com/try/download/compass

2. **Conectar ao MongoDB:**
   - Abra o MongoDB Compass
   - String de conexão: `mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/`
   - Clique em "Connect"

3. **Exportar Conversas:**
   - Navegue até o banco de dados (provavelmente `test` ou `whatsapp`)
   - Encontre a coleção `mensagens`
   - Clique nos 3 pontinhos → "Export Collection"
   - Formato: **JSON**
   - Salve como: `backup-mensagens-${DATA}.json`

4. **✅ Confirmar Backup:**
   - Verifique se o arquivo foi salvo
   - Tamanho deve ser maior que 0 bytes
   - Abra no notepad para confirmar que tem dados

### Opção 2: Backup via Terminal (Alternativo)

```powershell
# Instalar MongoDB Database Tools (se não tiver)
# https://www.mongodb.com/try/download/database-tools

# Fazer backup
mongodump --uri="mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/" --out="C:\Users\pc\Downloads\backup-whatsapp-$(Get-Date -Format 'yyyy-MM-dd')"
```

---

## 💻 PASSO 2: Clonar Repositórios Localmente

### 2.1 - Criar Pasta de Trabalho

```powershell
# Criar pasta separada para desenvolvimento
cd C:\Users\pc\Downloads
New-Item -ItemType Directory -Path "whatsapp-dev" -Force
cd whatsapp-dev
```

### 2.2 - Clonar Backend

```powershell
# Clonar repositório do backend
git clone https://github.com/JhonTech-prog/whatsapp.git backend
cd backend

# Ver estrutura
dir
```

### 2.3 - Clonar Frontend

```powershell
# Voltar para pasta raiz
cd ..

# Clonar repositório do frontend
git clone https://github.com/JhonTech-prog/whats.git frontend
cd frontend

# Ver estrutura
dir
```

---

## 🔧 PASSO 3: Configurar Backend Local

### 3.1 - Instalar Dependências

```powershell
cd C:\Users\pc\Downloads\whatsapp-dev\backend

# Instalar Node.js (se não tiver)
# https://nodejs.org/

# Instalar dependências
npm install
```

### 3.2 - Criar Banco de Dados LOCAL (Não afeta produção)

**OPÇÃO A: MongoDB Local (Recomendado para testes)**

```powershell
# Instalar MongoDB Community localmente
# https://www.mongodb.com/try/download/community

# Ou usar Docker
docker run -d -p 27017:27017 --name mongodb-local mongo:latest
```

**OPÇÃO B: MongoDB Atlas (Criar cluster separado)**

1. Acesse: https://cloud.mongodb.com
2. Crie um NOVO cluster (não use o de produção!)
3. Nome: `whatsapp-dev` ou `whatsapp-test`
4. Crie um novo banco de dados: `test_whatsapp`

### 3.3 - Configurar Variáveis de Ambiente

```powershell
cd C:\Users\pc\Downloads\whatsapp-dev\backend

# Criar arquivo .env
New-Item -ItemType File -Path ".env" -Force
```

**Edite o arquivo `.env` com:**

```env
# ========================================
# CONFIGURAÇÃO LOCAL DE DESENVOLVIMENTO
# ========================================

# MongoDB LOCAL (escolha uma opção)
# OPÇÃO 1: MongoDB Local
MONGO_URI=mongodb://localhost:27017/whatsapp_local

# OPÇÃO 2: MongoDB Atlas SEPARADO (não use o de produção!)
# MONGO_URI=mongodb+srv://usuario:senha@cluster-dev.mongodb.net/whatsapp_dev

# Token da Meta (mesmo de produção, pois webhook aponta para produção)
META_ACCESS_TOKEN=seu_token_aqui

# Porta LOCAL diferente da produção
PORT=3000
```

### 3.4 - Aplicar Correções no Backend

```powershell
# Copiar código corrigido
# Abra o arquivo: C:\Users\pc\Downloads\pratofit---cardápio-digital-premium\backend-corrigido-app.js
# Copie TODO o conteúdo
# Cole em: C:\Users\pc\Downloads\whatsapp-dev\backend\app.js
```

### 3.5 - Iniciar Backend Local

```powershell
cd C:\Users\pc\Downloads\whatsapp-dev\backend

# Iniciar servidor
node app.js

# ✅ Deve aparecer:
# ✅ MongoDB Conectado
# 🚀 Servidor Online 2026 na porta 3000
```

**Deixe esse terminal ABERTO**

---

## 🎨 PASSO 4: Configurar Frontend Local

### 4.1 - Instalar Dependências

```powershell
# ABRA UM NOVO TERMINAL PowerShell
cd C:\Users\pc\Downloads\whatsapp-dev\frontend

# Instalar dependências
npm install
```

### 4.2 - Aplicar Correções no Frontend

```powershell
# Copiar código corrigido
# Abra: C:\Users\pc\Downloads\pratofit---cardápio-digital-premium\frontend-corrigido-Inbox.tsx
# Copie TODO o conteúdo
# Cole em: C:\Users\pc\Downloads\whatsapp-dev\frontend\pages\Inbox.tsx
```

### 4.3 - Iniciar Frontend Local

```powershell
cd C:\Users\pc\Downloads\whatsapp-dev\frontend

# Iniciar servidor de desenvolvimento
npm run dev

# ✅ Deve aparecer:
# Local: http://localhost:5173
# (ou outra porta)
```

**Deixe esse terminal ABERTO**

---

## 🧪 PASSO 5: Testar Localmente

### 5.1 - Acessar Sistema Local

1. Abra o navegador em: `http://localhost:5173`
2. Vá em **Ajustes/Settings**
3. Configure:
   - **Bridge URL:** `http://localhost:3000`
   - **Access Token:** (seu token da Meta)
   - **Phone ID:** (seu Phone ID)
4. Clique em **Salvar**

### 5.2 - Importar Conversas Antigas (Opcional)

Se quiser testar com as conversas reais:

```powershell
# No MongoDB Compass conectado ao banco LOCAL:
# 1. Conecte em: mongodb://localhost:27017
# 2. Crie banco: whatsapp_local
# 3. Crie collection: mensagens
# 4. Clique em "ADD DATA" → "Import JSON"
# 5. Selecione o backup que você fez: backup-mensagens-2026-01-19.json
```

### 5.3 - Testar Funcionalidades

**Teste 1: Verificar Conexão**
- No frontend local, vá em Settings
- Clique em "Teste" (ao lado do Bridge URL)
- ✅ Deve aparecer: "PONTE CONECTADA"

**Teste 2: Ver Mensagens**
- Vá em "Inbox"
- ✅ Deve listar conversas (se importou backup)

**Teste 3: Enviar Mensagem de Teste**
- Crie um contato de teste
- Envie uma mensagem
- ✅ Verifique se aparece no MongoDB local

---

## 🚀 PASSO 6: Quando Aprovar, Deploy em Produção

### 6.1 - Criar Branch de Teste (Recomendado)

```powershell
# Backend
cd C:\Users\pc\Downloads\whatsapp-dev\backend
git checkout -b fix/media-support
git add app.js
git commit -m "fix: adicionar suporte completo a imagens e áudios"
# NÃO FAÇA PUSH AINDA - apenas quando testar tudo

# Frontend
cd C:\Users\pc\Downloads\whatsapp-dev\frontend
git checkout -b fix/media-display
git add pages/Inbox.tsx
git commit -m "feat: exibir imagens e áudios no inbox"
# NÃO FAÇA PUSH AINDA
```

### 6.2 - Fazer Deploy Gradual

**OPÇÃO 1: Deploy Direto (se tudo OK nos testes)**

```powershell
# Backend
cd C:\Users\pc\Downloads\whatsapp-dev\backend
git checkout main
git merge fix/media-support
git push origin main

# Frontend
cd C:\Users\pc\Downloads\whatsapp-dev\frontend
git checkout main
git merge fix/media-display
git push origin main
```

**OPÇÃO 2: Deploy com Staging (mais seguro)**

1. Faça push das branches:
   ```powershell
   git push origin fix/media-support
   git push origin fix/media-display
   ```

2. No Render/Vercel:
   - Crie um ambiente de **staging**
   - Faça deploy das branches de teste
   - URL exemplo: `https://whatsapp-staging.onrender.com`

3. Teste no staging por 1-2 dias

4. Se tudo OK, merge para `main`

---

## 📊 PASSO 7: Monitorar Produção Após Deploy

### 7.1 - Checklist Pós-Deploy

- [ ] Backend respondendo: `https://seu-backend.onrender.com/health`
- [ ] Frontend carregando: `https://pratofit.com.br`
- [ ] MongoDB conectado (ver logs)
- [ ] Webhook da Meta ativo
- [ ] Testar envio de imagem
- [ ] Testar envio de áudio
- [ ] Verificar conversas antigas intactas

### 7.2 - Rollback Rápido (se algo der errado)

```powershell
# Backend - voltar para commit anterior
cd C:\Users\pc\Downloads\whatsapp-dev\backend
git log --oneline  # Ver últimos commits
git revert HEAD    # Desfazer último commit
git push origin main

# Frontend - voltar para commit anterior
cd C:\Users\pc\Downloads\whatsapp-dev\frontend
git log --oneline
git revert HEAD
git push origin main
```

---

## 🔒 SEGURANÇA - Não Expor Dados Sensíveis

### Arquivos a NUNCA commitar:

```
.env
.env.local
backup-*.json
node_modules/
```

### Criar .gitignore (se não existe):

```powershell
# Backend
cd C:\Users\pc\Downloads\whatsapp-dev\backend
New-Item -ItemType File -Path ".gitignore" -Force
```

**Conteúdo do .gitignore:**
```
node_modules/
.env
.env.local
.env.production
*.log
backup-*.json
```

---

## 📞 TROUBLESHOOTING

### Backend local não conecta no MongoDB:
```powershell
# Verificar se MongoDB está rodando
Get-Service MongoDB  # Windows
# Ou
docker ps  # Docker
```

### Frontend não conecta no backend local:
- Verificar se porta 3000 está livre
- Verificar firewall do Windows
- Testar: `curl http://localhost:3000/health`

### Webhook não funciona localmente:
- Normal! Webhook da Meta só funciona em HTTPS público
- Para testar webhook localmente, use: **ngrok**
  ```powershell
  # Instalar ngrok: https://ngrok.com/
  ngrok http 3000
  # Copiar URL pública (https://xxxx.ngrok.io)
  # Configurar no painel da Meta
  ```

---

## ✅ CHECKLIST FINAL

### Antes de Começar:
- [ ] Backup do MongoDB feito
- [ ] Backup salvo em local seguro
- [ ] Repositórios clonados localmente
- [ ] Node.js instalado
- [ ] MongoDB local ou Atlas separado configurado

### Durante Desenvolvimento:
- [ ] Backend rodando localmente (porta 3000)
- [ ] Frontend rodando localmente (porta 5173)
- [ ] Testes de imagem funcionando
- [ ] Testes de áudio funcionando
- [ ] Conversas antigas preservadas

### Antes do Deploy:
- [ ] Todos os testes passando localmente
- [ ] Código commitado em branch separada
- [ ] .gitignore configurado
- [ ] Variáveis de ambiente verificadas
- [ ] Plano de rollback preparado

---

## 📝 RESUMO DOS COMANDOS

```powershell
# 1. BACKUP
# Use MongoDB Compass para exportar mensagens

# 2. CLONAR
cd C:\Users\pc\Downloads
mkdir whatsapp-dev
cd whatsapp-dev
git clone https://github.com/JhonTech-prog/whatsapp.git backend
git clone https://github.com/JhonTech-prog/whats.git frontend

# 3. BACKEND
cd backend
npm install
# Criar .env e configurar
# Copiar código corrigido para app.js
node app.js

# 4. FRONTEND (NOVO TERMINAL)
cd ..\frontend
npm install
# Copiar código corrigido para pages/Inbox.tsx
npm run dev

# 5. TESTAR
# Abrir http://localhost:5173
# Configurar Bridge URL: http://localhost:3000
# Testar funcionalidades

# 6. DEPLOY (SÓ QUANDO APROVAR)
# Backend
cd backend
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

---

**Última Atualização:** 19/01/2026

# Backend do PratoFit - Guia de Deploy no Render

## 📦 O que fazer:

### **1. Criar conta no Render**
Acesse: https://render.com (use GitHub para login)

### **2. Criar Web Service**
1. Dashboard → **New** → **Web Service**
2. Conectar repositório: `JhonTech-prog/CARDAPIO-PRATO-FIT`
3. Configurações:
   - **Name**: `pratofit-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### **3. Variáveis de Ambiente**
Adicionar no Render:
```
MONGODB_URI = mongodb+srv://jhon:002513@cluster0.eibqck8.mongodb.net/pratofit?retryWrites=true&w=majority&appName=Cluster0
PORT = 3001
IFOOD_ENABLED = false
IFOOD_CLIENT_ID = 6982eea6-6afb-4c6e-87b3-f22905fc7cf3
IFOOD_CLIENT_SECRET = 8fi24k5a8zmk0932usj5lup03kxu3xse44xr1mij
```

### **4. Deploy**
Clicar em **Create Web Service**
- Aguardar build (3-5 min)
- URL será algo como: `https://pratofit-backend.onrender.com`

### **5. Atualizar Frontend**
No Vercel, atualizar variável:
```
VITE_API_URL = https://pratofit-backend.onrender.com
```

---

## 🚀 Alternativa: Railway

### **Criar no Railway**
1. Acesse: https://railway.app
2. **New Project** → **Deploy from GitHub**
3. Selecionar: `JhonTech-prog/CARDAPIO-PRATO-FIT`
4. Root Directory: `server`
5. Adicionar mesmas variáveis de ambiente
6. Deploy automático

---

## ⚠️ IMPORTANTE

**Render FREE tem limitação:**
- Inatividade > 15min = servidor hiberna
- Primeira requisição demora ~30s para acordar
- Depois fica rápido

**Solução:** Usar cron job para manter ativo:
```
https://cron-job.org
```
Fazer ping a cada 10 minutos em: `https://pratofit-backend.onrender.com/health`

---

**URL Final:**
- Frontend: https://pratofit.com.br
- Backend: https://pratofit-backend.onrender.com
- Mobile: https://estoque.pratofit.com.br

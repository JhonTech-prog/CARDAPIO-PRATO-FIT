# 🔧 CORREÇÕES NECESSÁRIAS - Sistema WhatsApp

## ⚠️ PROBLEMA 1: URL da API do Facebook Incompleta

### Localização
**Repositório:** https://github.com/JhonTech-prog/whatsapp.git  
**Arquivo:** `app.js` (linha 40)

### Código Atual (ERRADO):
```javascript
async function getMediaUrl(mediaId) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const idLimpo = String(mediaId).replace(/[^0-9]/g, '');
        // CORREÇÃO: Adicionada a barra "/" após o v24.0
        const urlFinal = "graph.facebook.com" + idLimpo; // ❌ ERRO: Falta https:// e /v24.0/
        
        console.log("🔗 Buscando URL correta em: " + urlFinal);

        const response = await fetch(urlFinal, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + tokenLimpo }
        });

        const data = await response.json();
        if (data && data.url) return data.url;
        
        console.error("❌ Resposta da Meta sem URL:", data);
        return null;
    } catch (error) {
        console.error("❌ Erro na montagem da URL:", error.message);
        return null;
    }
}
```

### ✅ Código CORRETO:
```javascript
async function getMediaUrl(mediaId) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const idLimpo = String(mediaId).replace(/[^0-9]/g, '');
        // CORREÇÃO: URL completa com https:// e /v24.0/
        const urlFinal = `https://graph.facebook.com/v24.0/${idLimpo}`;
        
        console.log("🔗 Buscando URL correta em: " + urlFinal);

        const response = await fetch(urlFinal, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + tokenLimpo }
        });

        const data = await response.json();
        if (data && data.url) return data.url;
        
        console.error("❌ Resposta da Meta sem URL:", data);
        return null;
    } catch (error) {
        console.error("❌ Erro na montagem da URL:", error.message);
        return null;
    }
}
```

---

## ⚠️ PROBLEMA 2: Schema MongoDB Não Suporta Mídia

### Localização
**Arquivo:** `app.js` (linhas 16-24)

### Código Atual (INCOMPLETO):
```javascript
const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String,  // ❌ Só salva texto
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now }
});
```

### ✅ Código CORRETO:
```javascript
const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String,
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now },
  // ✅ NOVOS CAMPOS PARA MÍDIA:
  mediaUrl: String,      // URL base64 da imagem/áudio
  mediaType: String,     // 'image', 'audio', 'video', etc.
  caption: String        // Legenda da mídia (se houver)
});
```

---

## ⚠️ PROBLEMA 3: Salvar Mídia no Banco

### Localização
**Arquivo:** `app.js` (linhas 124-133)

### Código Atual:
```javascript
const novaMensagem = new Mensagem({
  idMeta: messageData.id,
  telefone: messageData.from,
  nome: nomeContato,
  texto: conteudoParaSalvar || "[Mídia não processada]",  // ❌ Salva base64 no campo texto
  tipo: tipo,
  timestamp: messageData.timestamp
});
```

### ✅ Código CORRETO:
```javascript
// Separar texto e mídia
let textoFinal = '';
let mediaUrl = null;
let caption = null;

if (tipo === 'text') {
    textoFinal = conteudoParaSalvar;
} else if (tipo === 'image' || tipo === 'audio' || tipo === 'voice') {
    mediaUrl = conteudoParaSalvar;  // Base64
    textoFinal = tipo === 'image' ? '📷 Imagem' : '🎤 Áudio';
    // Capturar legenda se houver
    caption = messageData[tipo]?.caption || null;
}

const novaMensagem = new Mensagem({
  idMeta: messageData.id,
  telefone: messageData.from,
  nome: nomeContato,
  texto: textoFinal,
  tipo: tipo,
  timestamp: messageData.timestamp,
  mediaUrl: mediaUrl,      // ✅ Campo separado para mídia
  mediaType: tipo,         // ✅ Tipo da mídia
  caption: caption         // ✅ Legenda
});
```

---

## ⚠️ PROBLEMA 4: Frontend Não Exibe Mídia

### Localização
**Repositório:** https://github.com/JhonTech-prog/whats.git  
**Arquivo:** `pages/Inbox.tsx` (linha 246-256)

### Código Atual:
```tsx
{chatGroups[selectedChat].map((msg: any) => (
  <div key={msg.id} className={`max-w-[85%] rounded-2xl p-2 ${msg.isMe ? 'bg-[#dcf8c6] self-end' : 'bg-white self-start'}`}>
    <p className="text-sm">{msg.text}</p>  {/* ❌ Só mostra texto */}
    <p className="text-[8px] opacity-40 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
  </div>
))}
```

### ✅ Código CORRETO:
```tsx
{chatGroups[selectedChat].map((msg: any) => (
  <div key={msg.id} className={`max-w-[85%] rounded-2xl p-2 ${msg.isMe ? 'bg-[#dcf8c6] self-end' : 'bg-white self-start'}`}>
    
    {/* ✅ EXIBIR IMAGEM */}
    {(msg.type === 'image' || msg.mediaType === 'image') && msg.mediaUrl && (
      <img 
        src={msg.mediaUrl} 
        alt="Imagem"
        className="max-w-full rounded-lg cursor-pointer"
        onClick={() => window.open(msg.mediaUrl, '_blank')}
      />
    )}

    {/* ✅ EXIBIR ÁUDIO */}
    {(msg.type === 'audio' || msg.type === 'voice' || msg.mediaType === 'audio') && msg.mediaUrl && (
      <audio controls className="max-w-full">
        <source src={msg.mediaUrl} />
        Seu navegador não suporta áudio.
      </audio>
    )}

    {/* ✅ TEXTO ou LEGENDA */}
    {msg.text && msg.text !== '📷 Imagem' && msg.text !== '🎤 Áudio' && (
      <p className="text-sm mt-2">{msg.text}</p>
    )}
    {msg.caption && <p className="text-xs italic mt-1">{msg.caption}</p>}
    
    <p className="text-[8px] opacity-40 text-right mt-1">
      {new Date(msg.timestamp).toLocaleTimeString()}
    </p>
  </div>
))}
```

---

## ⚠️ PROBLEMA 5: Sincronização Entre Dispositivos

### Causa
O endpoint `/messages` retorna apenas 20 mensagens:
```javascript
app.get('/messages', async (req, res) => {
    const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(20); // ❌ LIMITE
});
```

### ✅ SOLUÇÃO 1: Remover Limite (Simples)
```javascript
app.get('/messages', async (req, res) => {
    try {
      // Buscar TODAS as mensagens dos últimos 7 dias
      const seteDiasAtras = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const mensagens = await Mensagem.find({
        timestamp: { $gte: seteDiasAtras }
      }).sort({ dataRecebimento: -1 });
      
      res.status(200).json(mensagens);
    } catch (err) {
      res.status(500).send("Erro ao buscar");
    }
});
```

### ✅ SOLUÇÃO 2: Paginação (Avançado)
```javascript
app.get('/messages', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const telefone = req.query.phone; // Filtrar por telefone específico
      
      const query = telefone ? { telefone } : {};
      const skip = (page - 1) * limit;
      
      const mensagens = await Mensagem
        .find(query)
        .sort({ dataRecebimento: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Mensagem.countDocuments(query);
      
      res.status(200).json({
        mensagens,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      res.status(500).send("Erro ao buscar");
    }
});
```

---

## ⚠️ PROBLEMA 6: Frontend - Mapear Campos do Backend

### Localização
**Arquivo:** `pages/Inbox.tsx` (linhas 100-120)

### Código Atual:
```tsx
const formattedMessages: IncomingMessage[] = rawData.map((m: any) => {
  let rawText = m.text || m.texto || m.body || '';
  // ...
  return {
    id: stableId,
    from: String(m.from || m.de || m.telefone || '').replace(/\D/g, ''),
    fromName: m.push_name || m.pushName || m.nome || m.name || undefined,
    text: finalText,
    type: detectedType,
    mediaUrl: mediaUrl,  // ❌ Não pega do banco
    timestamp: new Date(timestampMs).toISOString(),
    unread: m.unread !== undefined ? m.unread : true,
    isMe: m.isMe || false
  };
});
```

### ✅ Código CORRETO:
```tsx
const formattedMessages: IncomingMessage[] = rawData.map((m: any) => {
  let rawText = m.text || m.texto || m.body || '';
  let detectedType: MessageType = m.tipo || m.type || m.mediaType || 'text';  // ✅ Campo 'tipo' do Mongo
  let mediaUrl = m.mediaUrl || m.image_url || m.audio_url || m.url;  // ✅ Buscar mediaUrl do Mongo
  let finalText = rawText;

  // Se tem mediaUrl no banco, usa ela
  if (mediaUrl) {
    if (detectedType === 'image') {
      finalText = '📷 Imagem';
    } else if (detectedType === 'audio' || detectedType === 'voice') {
      finalText = '🎤 Áudio';
    }
  }
  // Se base64 está no texto (compatibilidade antiga)
  else if (typeof rawText === 'string') {
    if (rawText.startsWith('data:image/')) {
      detectedType = 'image'; 
      mediaUrl = rawText; 
      finalText = '📷 Imagem';
    } else if (rawText.startsWith('data:audio/')) {
      detectedType = 'audio'; 
      mediaUrl = rawText; 
      finalText = '🎤 Áudio';
    }
  }

  return {
    id: stableId,
    from: String(m.from || m.de || m.telefone || '').replace(/\D/g, ''),
    fromName: m.push_name || m.pushName || m.nome || m.name || undefined,
    text: finalText,
    type: detectedType,
    mediaUrl: mediaUrl,
    caption: m.caption || undefined,  // ✅ Adicionar legenda
    timestamp: new Date(timestampMs).toISOString(),
    unread: m.unread !== undefined ? m.unread : true,
    isMe: m.isMe || false
  };
});
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Backend (app.js)
- [ ] Corrigir URL da API do Facebook (linha 40)
- [ ] Atualizar Schema do MongoDB (adicionar campos de mídia)
- [ ] Modificar salvamento de mensagem (separar texto de mídia)
- [ ] Atualizar endpoint `/messages` (remover limite ou adicionar paginação)

### Frontend (pages/Inbox.tsx)
- [ ] Atualizar mapeamento de mensagens (linhas 100-120)
- [ ] Adicionar renderização de imagens (linha 246+)
- [ ] Adicionar renderização de áudios (linha 246+)
- [ ] Testar legendas de mídia

### Testes
- [ ] Enviar uma imagem pelo WhatsApp → Verificar se aparece no navegador
- [ ] Enviar um áudio pelo WhatsApp → Verificar se toca no navegador
- [ ] Acessar pelo celular → Acessar pelo navegador → Ver se sincroniza

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

1. **BACKEND PRIMEIRO** (Repositório `whatsapp`)
   - Corrigir URL da API (crítico)
   - Atualizar schema MongoDB
   - Modificar salvamento de mensagens

2. **TESTAR BACKEND**
   - Enviar mensagem de teste
   - Verificar logs do servidor
   - Verificar banco MongoDB

3. **FRONTEND DEPOIS** (Repositório `whats`)
   - Atualizar mapeamento de mensagens
   - Adicionar renderização de mídia
   - Testar sincronização

---

## ⚙️ VARIÁVEIS DE AMBIENTE

Certifique-se de que estas variáveis estão configuradas no Render/servidor:

```env
META_ACCESS_TOKEN=seu_token_aqui
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/
PORT=10000
```

---

## 📞 SUPORTE

Se após implementar essas correções ainda houver problemas:

1. Verificar logs do servidor (Render console)
2. Verificar browser console (F12)
3. Verificar MongoDB Atlas (coleção `mensagens`)
4. Verificar webhook da Meta (deve estar apontando para seu servidor)

---

**Última Atualização:** 19/01/2026

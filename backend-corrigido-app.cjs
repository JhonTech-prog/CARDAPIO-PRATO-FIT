// ========================================
// BACKEND CORRIGIDO - app.js
// Repositório: https://github.com/JhonTech-prog/whatsapp.git
// ========================================

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Conectado"))
  .catch(err => console.error("❌ Erro MongoDB:", err.message));

// 2. MODELO DE DADOS - ✅ ATUALIZADO COM CAMPOS DE MÍDIA
const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String, 
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now },
  // ✅ NOVOS CAMPOS PARA SUPORTAR MÍDIA
  mediaUrl: String,      // URL base64 da imagem/áudio
  mediaType: String,     // 'image', 'audio', 'video', etc.
  caption: String        // Legenda da mídia
});
const Mensagem = mongoose.model('Mensagem', MensagemSchema);

const port = process.env.PORT || 3000;
const verifyToken = "G3rPF002513";

// --- FUNÇÕES DE MÍDIA CORRIGIDAS ---

// ✅ CORREÇÃO 1: URL completa da API do Facebook
async function getMediaUrl(mediaId) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
      const idLimpo = String(mediaId).replace(/[^0-9]/g, '');
      // ✅ URL CORRIGIDA: https:// + domínio + /v24.0/ + ID
      const urlFinal = `https://graph.facebook.com/v24.0/${idLimpo}`;

      console.log("🔗 Buscando URL de mídia em:", urlFinal);
      console.log("🆔 mediaId recebido:", mediaId);
      console.log("🆔 mediaId limpo:", idLimpo);

      const response = await fetch(urlFinal, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + tokenLimpo }
      });

      const data = await response.json();
      console.log("📦 Resposta completa da Meta:", JSON.stringify(data));
      if (data && data.url) {
        console.log("✅ URL temporária obtida com sucesso");
        return data.url;
      }

      console.error("❌ Resposta da Meta sem URL:", data);
      return null;
    } catch (error) {
      console.error("❌ Erro ao buscar URL de mídia:", error.message);
      return null;
    }
}

async function downloadMediaAsBase64(url) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        console.log("⬇️ Baixando mídia de:", url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + tokenLimpo }
        });

        if (!response.ok) {
            console.error("❌ Erro HTTP ao baixar mídia:", response.status);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        console.log("✅ Mídia convertida para base64. Tipo:", contentType);
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("❌ Erro ao fazer download da mídia:", error.message);
        return null;
    }
}

// 3. ROTAS

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log("✅ Webhook verificado com sucesso");
    return res.status(200).send(challenge);
  }
  
  console.error("❌ Token de verificação inválido");
  res.status(403).send('Token inválido');
});

app.post('/webhook', async (req, res) => {
  // Responder imediatamente para a Meta
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    
    // Validações básicas
    if (!body.entry || !body.entry[0].changes) {
      console.log("⚠️ Webhook recebido sem dados relevantes");
      return;
    }

    const value = body.entry[0].changes[0].value;
    if (!value.messages) {
      console.log("⚠️ Webhook recebido sem mensagens");
      return;
    }

    const messageData = value.messages[0];
    const contact = value.contacts ? value.contacts[0] : null;
    
    const tipo = messageData.type;
    const nomeContato = contact ? contact.profile.name : "Desconhecido";
    
    console.log(`📨 Nova mensagem de ${nomeContato} (${messageData.from}) - Tipo: ${tipo}`);
    
    // ✅ CORREÇÃO 2: Separar texto de mídia
    let textoParaSalvar = '';
    let mediaUrl = null;
    let caption = null;

    if (tipo === 'text') {
        textoParaSalvar = messageData.text.body;
        console.log("💬 Mensagem de texto recebida");
    } 
    else if (tipo === 'image' || tipo === 'audio' || tipo === 'voice') {
        console.log(`🎨 Processando mídia do tipo: ${tipo}`);
        
        // Buscar objeto de mídia
        const midiaObj = messageData[tipo] || messageData.voice || messageData.audio;
        const midiaId = midiaObj ? midiaObj.id : null;
        caption = midiaObj?.caption || null;
        
        if (midiaId) {
            console.log(`🔑 ID da mídia: ${midiaId}`);
            
            // 1. Obter URL temporária da Meta
            const urlTemp = await getMediaUrl(midiaId);
            
            if (urlTemp) {
                // 2. Baixar e converter para base64
                const base64Data = await downloadMediaAsBase64(urlTemp);
                
                if (base64Data) {
                    mediaUrl = base64Data;
                    textoParaSalvar = tipo === 'image' ? '📷 Imagem' : '🎤 Áudio';
                    console.log("✅ Mídia processada com sucesso!");
                } else {
                    textoParaSalvar = "[Erro ao converter mídia para base64]";
                    console.error("❌ Falha na conversão para base64");
                }
            } else {
                textoParaSalvar = "[Erro ao obter URL temporária da Meta]";
                console.error("❌ Falha ao obter URL da Meta");
            }
        } else {
            textoParaSalvar = "[ID da mídia não encontrado]";
            console.error("❌ ID da mídia não encontrado no webhook");
        }
    } else {
        textoParaSalvar = `[Tipo de mensagem não suportado: ${tipo}]`;
        console.warn(`⚠️ Tipo de mensagem não suportado: ${tipo}`);
    }

    // ✅ CORREÇÃO 3: Salvar com campos de mídia separados
    const novaMensagem = new Mensagem({
      idMeta: messageData.id,
      telefone: messageData.from,
      nome: nomeContato,
      texto: textoParaSalvar,
      tipo: tipo,
      timestamp: messageData.timestamp,
      mediaUrl: mediaUrl,      // ✅ Campo separado para mídia
      mediaType: tipo,         // ✅ Tipo da mídia
      caption: caption         // ✅ Legenda (se houver)
    });

    await novaMensagem.save();
    console.log(`💾 SALVO COM SUCESSO: ${tipo} de ${nomeContato}`);
    console.log(`   - Texto: ${textoParaSalvar}`);
    console.log(`   - Mídia: ${mediaUrl ? 'Sim' : 'Não'}`);
    console.log(`   - Legenda: ${caption || 'Não'}`);

  } catch (err) {
    console.error("❌ Erro Geral no Webhook:", err.message);
    console.error(err.stack);
  }
});

// ✅ CORREÇÃO 4: Endpoint /messages sem limite de 20
app.get('/messages', async (req, res) => {
    try {
      const telefone = req.query.phone; // Opcional: filtrar por telefone
      
      // Buscar mensagens dos últimos 7 dias
      const seteDiasAtras = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const query = {
        timestamp: { $gte: Math.floor(seteDiasAtras / 1000) } // timestamp em segundos
      };
      
      // Se forneceu telefone, filtrar
      if (telefone) {
        query.telefone = telefone.replace(/\D/g, '');
      }
      
      const mensagens = await Mensagem
        .find(query)
        .sort({ dataRecebimento: -1 });
      
      console.log(`📤 Enviando ${mensagens.length} mensagens para o cliente`);
      res.status(200).json(mensagens);
      
    } catch (err) {
      console.error("❌ Erro ao buscar mensagens:", err.message);
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
});

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado'
  });
});

app.listen(port, () => {
  console.log("🚀 Servidor Online 2026 na porta " + port);
  console.log("📱 Webhook: https://seu-dominio.com/webhook");
  console.log("📨 Mensagens: https://seu-dominio.com/messages");
});

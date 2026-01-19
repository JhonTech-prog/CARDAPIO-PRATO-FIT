// Script para atualizar mensagens antigas no MongoDB, buscando mediaUrl na Meta
// Salve como updateMediaUrls.js e rode com: node updateMediaUrls.js


console.log('Iniciando script de atualização de mediaUrl...');
require('dotenv').config();
const mongoose = require('mongoose');
const fetch = require('node-fetch');


const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/pratofit";
const metaToken = process.env.META_ACCESS_TOKEN || "";
console.log('MONGO_URI:', mongoURI);
if (!metaToken) {
  console.warn('⚠️  META_ACCESS_TOKEN não definido. As requisições para a API Meta podem falhar.');
}

const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  mediaId: String,
  mediaUrl: String,
  mediaType: String,
  texto: String,
  tipo: String,
  caption: String,
});
const Mensagem = mongoose.model('Mensagem', MensagemSchema, 'mensagens');

async function getMediaUrl(mediaId) {
  if (!mediaId) {
    console.error('mediaId vazio ou indefinido:', mediaId);
    return null;
  }
  const idLimpo = String(mediaId).replace(/[^0-9]/g, '');
  console.log('Montando URL para mediaId:', mediaId, 'idLimpo:', idLimpo);
  const urlFinal = `https://graph.facebook.com/v24.0/${idLimpo}`;
  try {
    console.log(`Buscando mediaUrl para mediaId: ${mediaId} (url: ${urlFinal})`);
    const response = await fetch(urlFinal, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + metaToken }
    });
    const data = await response.json();
    if (data && data.url) return data.url;
    console.error('Meta response:', data);
    return null;
  } catch (err) {
    console.error('Erro ao buscar URL:', err.message);
    return null;
  }
}

async function updateMessages() {
  console.log('Conectando ao MongoDB...');
  await mongoose.connect(mongoURI);
  console.log('Conectado! Buscando mensagens para atualizar...');
  const msgs = await Mensagem.find({ mediaUrl: { $in: [null, ''] }, mediaId: { $exists: true, $ne: '' } }).limit(50);
  console.log(`Encontradas ${msgs.length} mensagens para atualizar.`);
  let atualizadas = 0;
  for (const msg of msgs) {
    console.log(`Processando mensagem _id=${msg._id} mediaId=${msg.mediaId}`);
    const url = await getMediaUrl(msg.mediaId || msg.idMeta);
    if (url) {
      msg.mediaUrl = url;
      await msg.save();
      atualizadas++;
      console.log(`✅ Atualizado: ${msg._id} -> ${url}`);
    } else {
      console.log(`❌ Falha: ${msg._id} mediaId=${msg.mediaId}`);
    }
  }
  console.log(`Processo finalizado. Total atualizadas: ${atualizadas}`);
  mongoose.disconnect();
}

updateMessages().catch(e => {
  console.error('Erro geral:', e);
  process.exit(1);
});

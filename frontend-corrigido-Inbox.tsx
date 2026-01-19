// ========================================
// FRONTEND CORRIGIDO - Inbox.tsx
// Repositório: https://github.com/JhonTech-prog/whats.git
// Arquivo: pages/Inbox.tsx
// ========================================

import React, { useState, useEffect, useRef } from 'react';
// import { IncomingMessage, AutomationSettings, Contact, MessageType } from '../types.ts';
// import { sendWhatsAppMessage, sendWhatsAppMedia } from '../services/whatsappService.ts';
// import { safeGenerateId } from '../App.tsx';

const Inbox: React.FC = () => {
  // Corrija os tipos abaixo conforme necessário
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [debugLog, setDebugLog] = useState<string>('Sistema pronto.');
  const [serverHealth, setServerHealth] = useState<'up' | 'down' | 'unknown'>('unknown');
  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const pollingRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') {
      return ts < 10000000000 ? ts * 1000 : ts;
    }
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChat, messages]);

  const loadContacts = () => {
    try {
      const saved = localStorage.getItem('wb_contacts');
      if (saved) setSavedContacts(JSON.parse(saved));
    } catch(e) {}
  };

  useEffect(() => {
    loadContacts();
    window.addEventListener('storage', loadContacts);
    return () => window.removeEventListener('storage', loadContacts);
  }, []);

  // Função de salvar contato (ajuste implementação depois)
  const autoSaveContact = (phone: string, profileName?: string) => {
    try {
      const contactsRaw = localStorage.getItem('wb_contacts');
      const contacts: any[] = contactsRaw ? JSON.parse(contactsRaw) : [];
      
      const exists = contacts.find(c => c.phone === phone);
      if (!exists) {
        const automationRaw = localStorage.getItem('wb_automation_settings');
        const automation: any = automationRaw ? JSON.parse(automationRaw) : null;
        
        if (automation?.leadGrouping?.enabled) {
          const newContact: any = {
            id: 'id-fake', // safeGenerateId removido, ajuste depois
            name: profileName || `+${phone}`,
            phone: phone,
            group: automation.leadGrouping.groupName || 'Leads Orgânicos'
          };
          const updated = [newContact, ...contacts];
          localStorage.setItem('wb_contacts', JSON.stringify(updated));
          setSavedContacts(updated);
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch(e) {}
  };

  const fetchMessages = async (isManual = false) => {
    try {
      const configRaw = localStorage.getItem('wb_sender_config');
      const config = configRaw ? JSON.parse(configRaw) : {};
      if (!config.bridgeUrl) return;

      const dataUrl = config.bridgeUrl.endsWith('/messages') 
        ? config.bridgeUrl 
        : (config.bridgeUrl.endsWith('/') ? config.bridgeUrl + 'messages' : config.bridgeUrl + '/messages');

      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error();
      const rawData = await response.json();
      setServerHealth('up');

      if (Array.isArray(rawData)) {
        // ✅ CORREÇÃO: Mapear campos de mídia do MongoDB
        const formattedMessages: any[] = rawData.map((m: any) => {
          const timestampMs = normalizeTimestamp(m.timestamp);
          const stableId = m.id || m._id || `msg-${m.from || m.telefone}-${timestampMs}`;
          
          let rawText = m.text || m.texto || m.body || '';
          
          // ✅ Buscar tipo e mídia dos campos do MongoDB
          let detectedType: any = m.mediaType || m.tipo || m.type || 'text';
          let mediaUrl = m.mediaUrl || m.image_url || m.audio_url || m.url;
          let finalText = rawText;

          // Se tem mediaUrl do banco, usar ela
          if (mediaUrl && mediaUrl.startsWith('data:')) {
            if (detectedType === 'image' || mediaUrl.includes('image/')) {
              detectedType = 'image';
              finalText = '📷 Imagem';
            } else if (detectedType === 'audio' || detectedType === 'voice' || mediaUrl.includes('audio/')) {
              detectedType = 'audio';
              finalText = '🎤 Áudio';
            }
          }
          // Compatibilidade: se base64 está no campo texto (formato antigo)
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
            caption: m.caption || undefined,  // ✅ Incluir legenda
            timestamp: new Date(timestampMs).toISOString(),
            unread: m.unread !== undefined ? m.unread : true,
            isMe: m.isMe || false
          };
        });

        const localSavedRaw = localStorage.getItem('wb_incoming');
        const localSaved = localSavedRaw ? JSON.parse(localSavedRaw) : [];
        const messageMap = new Map();
        if (Array.isArray(localSaved)) localSaved.forEach((m: any) => messageMap.set(m.id, m));
        formattedMessages.forEach((m: any) => messageMap.set(m.id, m));
        const merged = Array.from(messageMap.values()) as any[];
        merged.sort((a, b) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp));

        setMessages(merged);
        localStorage.setItem('wb_incoming', JSON.stringify(merged));
        
        if (isManual) setDebugLog(`Sincronizado ${merged.length} mensagens.`);
        formattedMessages.filter(m => !m.isMe).forEach(msg => autoSaveContact(msg.from, msg.fromName));
      }
    } catch (e) {
      setServerHealth('down');
      setDebugLog('Erro na ponte.');
    }
  };

  useEffect(() => {
    try {
      const configRaw = localStorage.getItem('wb_sender_config');
      const config = configRaw ? JSON.parse(configRaw) : {};
      if (config.bridgeUrl) {
        fetchMessages();
        pollingRef.current = window.setInterval(() => fetchMessages(), 10000);
      }
      const saved = localStorage.getItem('wb_incoming');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.sort((a: any, b: any) => normalizeTimestamp(a.timestamp) - normalizeTimestamp(b.timestamp));
          setMessages(parsed);
        }
      }
    } catch(e) {}
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleSendReply = async () => {
    if (!selectedChat || !replyText.trim() || isSendingReply) return;
    const configRaw = localStorage.getItem('wb_sender_config');
    const config = configRaw ? JSON.parse(configRaw) : {};
    if (!config.accessToken || !config.phoneId) return alert("Configure suas credenciais.");

    setIsSendingReply(true);
    // Função de envio de mensagem removida, ajuste depois
    alert('Função de envio de mensagem não implementada.');
    setIsSendingReply(false);
  };

  const chatGroups = messages.reduce((acc: any, msg) => {
    const chatId = msg.from; 
    if (!acc[chatId]) acc[chatId] = [];
    acc[chatId].push(msg);
    return acc;
  }, {});

  const sortedPartners = Object.keys(chatGroups).sort((a, b) => {
    const lastA = normalizeTimestamp(chatGroups[a][chatGroups[a].length - 1].timestamp);
    const lastB = normalizeTimestamp(chatGroups[b][chatGroups[b].length - 1].timestamp);
    return lastB - lastA;
  });

  const getContactName = (phone: string) => {
    const contact = savedContacts.find(c => c.phone === phone);
    return contact ? contact.name : `+${phone}`;
  };

  return (
    <div className="bg-white rounded-none md:rounded-2xl border-0 md:border border-slate-200 shadow-sm overflow-hidden h-screen md:h-[calc(100vh-200px)] flex flex-col">
      <div className="px-4 py-3 bg-slate-900 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${serverHealth === 'up' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
          <span className="text-[10px] text-white font-bold uppercase">{serverHealth === 'up' ? 'Conectado' : 'Desconectado'}</span>
        </div>
        <button onClick={() => fetchMessages(true)} className="text-[9px] font-bold bg-white/10 text-white px-3 py-1 rounded">Sync Agora</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-100 flex-col bg-white overflow-y-auto`}>
          {sortedPartners.map(phone => {
            const partnerMsgs = chatGroups[phone];
            const lastMsg = partnerMsgs[partnerMsgs.length - 1];
            return (
              <button key={phone} onClick={() => setSelectedChat(phone)} className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50 border-b border-slate-50 ${selectedChat === phone ? 'bg-emerald-50' : ''}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-500">{getContactName(phone).charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{getContactName(phone)}</p>
                  <p className="text-xs text-slate-500 truncate">{lastMsg.text}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className={`${!selectedChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] relative`}>
          {selectedChat ? (
            <>
              <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
                <button onClick={() => setSelectedChat(null)} className="md:hidden text-slate-400">←</button>
                <p className="font-bold text-slate-800 text-sm">{getContactName(selectedChat)}</p>
              </div>
              <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col">
                {/* ✅ CORREÇÃO: Renderização de imagens e áudios */}
                {chatGroups[selectedChat].map((msg: any) => (
                  <div key={msg.id} className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.isMe ? 'bg-[#dcf8c6] self-end' : 'bg-white self-start'}`}>
                    
                    {/* ✅ EXIBIR IMAGEM OU ERRO */}
                    {(msg.type === 'image' || msg.mediaType === 'image') && (
                      <div className="mb-2">
                        {msg.mediaUrl ? (
                          <img 
                            src={msg.mediaUrl} 
                            alt="Imagem enviada"
                            className="max-w-full max-h-80 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(msg.mediaUrl)}
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', msg.mediaUrl);
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E❌ Erro%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
                            <span>Erro ao obter imagem</span>
                            <span className="opacity-60">mediaUrl ausente ou inválido</span>
                            <span className="opacity-40">ID: {msg.id}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ✅ EXIBIR ÁUDIO */}
                    {(msg.type === 'audio' || msg.type === 'voice' || msg.mediaType === 'audio') && msg.mediaUrl && (
                      <div className="mb-2">
                        <audio controls className="max-w-full" preload="metadata">
                          <source src={msg.mediaUrl} />
                          Seu navegador não suporta reprodução de áudio.
                        </audio>
                      </div>
                    )}

                    {/* ✅ TEXTO OU LEGENDA */}
                    {msg.text && msg.text !== '📷 Imagem' && msg.text !== '🎤 Áudio' && (
                      <p className="text-sm break-words">{msg.text}</p>
                    )}
                    
                    {/* ✅ EXIBIR LEGENDA DA MÍDIA */}
                    {msg.caption && (
                      <p className="text-xs italic text-slate-600 mt-1 pt-1 border-t border-slate-200">{msg.caption}</p>
                    )}
                    
                    <p className="text-[8px] opacity-40 text-right mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white border-t flex gap-2">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Mensagem..."
                  className="flex-1 bg-slate-50 border rounded-xl px-4 py-2 text-sm focus:outline-none resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <button onClick={handleSendReply} disabled={!replyText.trim() || isSendingReply} className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSendingReply ? '...' : '✈️'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-lg font-semibold">Selecione uma Conversa</p>
              <p className="text-sm">Escolha um contato na lista à esquerda</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ MODAL DE PREVIEW DE IMAGEM */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-slate-300"
            >
              ✕
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;

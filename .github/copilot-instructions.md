# Copilot Instructions for PratoFit Cardápio Digital Premium

## Visão Geral da Arquitetura
- O projeto é um sistema de gestão de cardápio digital e insumos para restaurantes, com frontend React (Vite), backend Node.js/Express (pasta `server/`), e integração com IA (Google Gemini) e WhatsApp/Meta.
- O backend principal está em `server/`, mas há scripts e backends auxiliares para WhatsApp e OCR.
- O frontend consome APIs REST do backend e serviços externos.
- Dados principais: ingredientes, receitas, pedidos, mensagens (WhatsApp), OCR de notas fiscais.

## Fluxos e Workflows
- **Desenvolvimento local:**
  - Instale dependências: `npm install`
  - Rode o frontend: `npm run dev` (porta padrão: 3000 ou 3003)
  - Rode o backend: `node server/index.js` (ou backend WhatsApp/OCR conforme necessário)
  - Variáveis de ambiente: `.env`, `.env.local` (ex: `VITE_API_URL`, `GEMINI_API_KEY`, `MONGO_URI`, `META_ACCESS_TOKEN`)
- **Deploy:**
  - Backend: Render, Railway ou Vercel (`server/DEPLOY.md`)
  - Frontend: Vercel, ajuste `VITE_API_URL` para o backend correto

## Convenções e Padrões
- **APIs RESTful**: Endpoints seguem `/api/entidade/ação` (ex: `/api/ingredients`, `/api/recipes`)
- **Componentização React**: Componentes em `components/`, hooks e serviços em `services/`
- **Integração IA**: Serviço Gemini em `services/geminiService.ts`, instruções de prompt e histórico customizados
- **Mensagens WhatsApp**: Backend separado, com modelo de mensagem incluindo campos de mídia (`mediaUrl`, `mediaType`)
- **OCR**: Serviços para extração de dados de notas fiscais e receitas

## Integrações e Dependências
- **Google Gemini**: API Key em `.env.local`, integração via `services/geminiService.ts`
- **Meta/WhatsApp**: Token em variável de ambiente, backend dedicado para mensagens e mídia
- **MongoDB**: URI em variável de ambiente, modelos Mongoose no backend
- **Tailwind**: Usado via CDN em dev, recomendado instalar como plugin para produção

## Exemplos e Referências
- Exemplos de uso de API e fluxo de cadastro em `GESTAO-INSUMOS.md`
- Deploy detalhado em `server/DEPLOY.md`
- Configuração mobile em `MOBILE_SETUP.md`

## Dicas para Agentes AI
- Sempre confira variáveis de ambiente antes de rodar localmente ou em produção
- Para novos endpoints, siga o padrão REST e atualize documentação relevante
- Use exemplos reais dos arquivos markdown para entender fluxos de negócio
- Para integração com IA, siga o padrão de histórico e instrução de sistema em `geminiService.ts`
- Para debugging de mídia WhatsApp, verifique logs do backend e campos `mediaUrl`/`mediaType` nas mensagens

---
Seções ou padrões não documentados? Consulte os arquivos markdown de onboarding e os exemplos de API para fluxos completos.

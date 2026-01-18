/**
 * Serviço para processar NFC-e (Nota Fiscal do Consumidor Eletrônica)
 * a partir do QR Code do cupom fiscal
 */

interface NFCeItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

interface NFCeData {
  supplier: string;
  cnpj: string;
  invoiceNumber: string;
  date: string;
  items: NFCeItem[];
  totalValue: number;
}

export const nfceService = {
  /**
   * Processa HTML da NFC-e recebido do backend
   */
  async processHTML(html: string): Promise<NFCeData> {
    try {
      console.log('✅ HTML recebido, extraindo dados...');
      
      // Parser do HTML da NFC-e
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Tenta extrair do texto bruto primeiro (mais confiável)
      const bodyText = doc.body?.textContent || html;
      
      // Extrai informações básicas de múltiplas formas
      let supplier = this.extractText(doc, 'razão social', 'nome', 'emitente', 'nome do emitente');
      if (!supplier) supplier = this.extractFromText(bodyText, /(?:razão social|emitente)[:\s]+([^\n]+)/i);
      
      let cnpj = this.extractText(doc, 'cnpj');
      if (!cnpj) cnpj = this.extractFromText(bodyText, /cnpj[:\s]*([\d.\/\-]+)/i);
      
      let invoiceNumber = this.extractText(doc, 'número', 'nota', 'nº');
      if (!invoiceNumber) invoiceNumber = this.extractFromText(bodyText, /(?:n[úu]mero|nota|nº)[:\s]*(\d+)/i);
      
      let date = this.extractText(doc, 'data', 'emissão');
      if (!date) date = this.extractFromText(bodyText, /(?:data|emiss[ãa]o)[:\s]*([\d\/]+)/i);
      
      let totalValue = this.extractValue(doc, 'total', 'valor', 'total da nota');
      if (totalValue === 0) {
        const totalMatch = bodyText.match(/(?:total|valor)[:\s]*r?\$?\s*([\d.,]+)/i);
        if (totalMatch) {
          totalValue = parseFloat(totalMatch[1].replace('.', '').replace(',', '.'));
        }
      }
      
      // Extrai itens da nota - múltiplas estratégias
      const items: NFCeItem[] = [];
      
      // Estratégia 1: Busca por elementos estruturados
      const itemElements = doc.querySelectorAll([
        '[class*="item"]',
        '[class*="produto"]',
        'tr[id*="item"]',
        'tr[class*="item"]',
        'div[class*="produto"]',
        'table tr:has(td)'
      ].join(', '));
      
      const processedNames = new Set<string>();
      
      itemElements.forEach((element) => {
        const name = this.extractTextFromElement(element, 'produto', 'descrição', 'nome', 'item', 'descrição do produto');
        if (!name || processedNames.has(name)) return;
        
        const quantityStr = this.extractTextFromElement(element, 'quantidade', 'qtd', 'qtde', 'quant');
        const quantity = parseFloat(quantityStr.replace(',', '.').replace(/[^\d.,]/g, '')) || 1;
        
        const unit = this.detectUnit(element.textContent || '', name);
        
        const unitCostStr = this.extractTextFromElement(element, 'unitário', 'un', 'preço', 'vl. unit', 'valor unitário');
        const unitCost = parseFloat(unitCostStr.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
        
        const totalCostStr = this.extractTextFromElement(element, 'total', 'valor', 'vl. total');
        const totalCost = parseFloat(totalCostStr.replace(/[^\d,]/g, '').replace(',', '.')) || (quantity * unitCost);
        
        if (name && quantity > 0 && totalCost > 0) {
          items.push({
            name: this.normalizeName(name),
            quantity,
            unit,
            unitCost: unitCost || (totalCost / quantity),
            totalCost
          });
          processedNames.add(name);
        }
      });
      
      // Estratégia 2: Se não encontrou itens, busca por padrões no texto
      if (items.length === 0) {
        console.log('⚠️ Nenhum item encontrado por HTML, tentando extração por texto...');
        const lines = bodyText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Padrão: nome do produto seguido de quantidade e valores
          const match = line.match(/^(.+?)\s+(\d+[,.]?\d*)\s+(\w+)?\s+r?\$?\s*([\d.,]+)\s+r?\$?\s*([\d.,]+)$/i);
          
          if (match) {
            const name = match[1].trim();
            if (processedNames.has(name)) continue;
            
            const quantity = parseFloat(match[2].replace(',', '.'));
            const unit = match[3] || this.detectUnit(line, name);
            const unitCost = parseFloat(match[4].replace('.', '').replace(',', '.'));
            const totalCost = parseFloat(match[5].replace('.', '').replace(',', '.'));
            
            if (name && quantity > 0 && totalCost > 0) {
              items.push({
                name: this.normalizeName(name),
                quantity,
                unit,
                unitCost,
                totalCost
              });
              processedNames.add(name);
            }
          }
        }
      }

      console.log('✅ Dados extraídos:', { supplier, cnpj, items: items.length });

      if (items.length === 0) {
        throw new Error('Nenhum produto foi encontrado na nota fiscal. Verifique se a nota está completa.');
      }

      return {
        supplier: supplier || 'Fornecedor não identificado',
        cnpj: cnpj || '',
        invoiceNumber: invoiceNumber || '',
        date: date || new Date().toLocaleDateString('pt-BR'),
        items,
        totalValue: totalValue || items.reduce((sum, item) => sum + item.totalCost, 0)
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar HTML da NFC-e:', error);
      throw new Error('Não foi possível processar a nota fiscal. ' + (error as Error).message);
    }
  },

  /**
   * Extrai texto usando regex
   */
  extractFromText(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  },

  /**
   * Extrai a URL da NFC-e do QR Code
   */
  async processQRCode(qrCodeUrl: string): Promise<NFCeData> {
    try {
      console.log('🔍 Processando QR Code da NFC-e:', qrCodeUrl);

      // O QR Code da NFC-e geralmente contém uma URL para a SEFAZ
      // Formato típico: http://www.fazenda.pr.gov.br/nfce/qrcode?p=...
      
      let nfceUrl = qrCodeUrl;
      
      // Se for só o código, monta a URL (adapte conforme seu estado)
      if (!qrCodeUrl.startsWith('http')) {
        // Aqui você pode adicionar lógica para detectar o estado
        nfceUrl = `https://www.sefaz.pb.gov.br/nfce/qrcode?p=${qrCodeUrl}`;
      }

      console.log('📄 Buscando dados da NFC-e...');
      
      // Busca o HTML da nota fiscal
      const response = await fetch(nfceUrl);
      const html = await response.text();
      
      console.log('✅ HTML recebido, extraindo dados...');
      
      // Parser do HTML da NFC-e
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extrai informações básicas
      const supplier = this.extractText(doc, 'razão social', 'nome', 'emitente');
      const cnpj = this.extractText(doc, 'cnpj');
      const invoiceNumber = this.extractText(doc, 'número', 'nota');
      const date = this.extractText(doc, 'data', 'emissão');
      const totalValue = this.extractValue(doc, 'total', 'valor');
      
      // Extrai itens da nota
      const items: NFCeItem[] = [];
      const itemElements = doc.querySelectorAll('[class*="item"], tr[id*="item"], .produto');
      
      itemElements.forEach((element) => {
        const name = this.extractTextFromElement(element, 'produto', 'descrição', 'nome');
        const quantityStr = this.extractTextFromElement(element, 'quantidade', 'qtd', 'qtde');
        const quantity = parseFloat(quantityStr.replace(',', '.')) || 1;
        const unit = this.detectUnit(quantityStr, name);
        const unitCostStr = this.extractTextFromElement(element, 'unitário', 'un', 'preço');
        const unitCost = parseFloat(unitCostStr.replace(',', '.').replace('R$', '').trim()) || 0;
        const totalCostStr = this.extractTextFromElement(element, 'total', 'valor');
        const totalCost = parseFloat(totalCostStr.replace(',', '.').replace('R$', '').trim()) || (quantity * unitCost);
        
        if (name && quantity > 0) {
          items.push({
            name: this.normalizeName(name),
            quantity,
            unit,
            unitCost,
            totalCost
          });
        }
      });

      console.log('✅ Dados extraídos:', { supplier, cnpj, items: items.length });

      return {
        supplier,
        cnpj,
        invoiceNumber,
        date,
        items,
        totalValue
      };
      
    } catch (error) {
      console.error('❌ Erro ao processar NFC-e:', error);
      throw new Error('Não foi possível processar a nota fiscal. Verifique se o QR Code é válido.');
    }
  },

  /**
   * Extrai texto do documento HTML
   */
  extractText(doc: Document, ...keywords: string[]): string {
    for (const keyword of keywords) {
      // Busca no texto completo
      const bodyText = doc.body?.textContent || '';
      const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+)`, 'i');
      const match = bodyText.match(regex);
      if (match && match[1].trim()) {
        return match[1].trim().split(/\s{2,}/)[0]; // Pega apenas a primeira parte
      }
      
      // Busca em elementos
      const elements = doc.querySelectorAll('*');
      for (const element of Array.from(elements)) {
        const text = element.textContent?.toLowerCase() || '';
        if (text.includes(keyword.toLowerCase())) {
          // Pega o próximo elemento ou o texto seguinte
          const nextSibling = element.nextElementSibling || element;
          let value = nextSibling.textContent?.trim() || '';
          
          // Se o valor está na mesma linha, extrai
          if (value.toLowerCase().includes(keyword.toLowerCase())) {
            value = value.split(keyword)[1]?.trim().split(/\s{2,}/)[0] || '';
          }
          
          if (value && value !== text && value.length < 200) {
            return value;
          }
        }
      }
    }
    return '';
  },

  /**
   * Extrai valor numérico
   */
  extractValue(doc: Document, ...keywords: string[]): number {
    const text = this.extractText(doc, ...keywords);
    const value = parseFloat(text.replace(',', '.').replace('R$', '').trim());
    return isNaN(value) ? 0 : value;
  },

  /**
   * Extrai texto de um elemento específico
   */
  extractTextFromElement(element: Element, ...keywords: string[]): string {
    const text = element.textContent?.toLowerCase() || '';
    
    // Busca por palavras-chave no texto do elemento
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // Extrai o valor após a palavra-chave
        const parts = element.textContent?.split(new RegExp(keyword, 'i')) || [];
        if (parts[1]) {
          return parts[1].trim().split(/\s{2,}/)[0];
        }
        return element.textContent?.trim() || '';
      }
    }
    
    // Busca em elementos filhos por classe ou id
    const children = element.querySelectorAll('*');
    for (const child of Array.from(children)) {
      const childClass = child.className?.toLowerCase() || '';
      const childId = child.id?.toLowerCase() || '';
      const childText = child.textContent?.toLowerCase() || '';
      
      for (const keyword of keywords) {
        const kw = keyword.toLowerCase();
        if (childClass.includes(kw) || childId.includes(kw) || childText.includes(kw)) {
          const value = child.textContent?.trim() || '';
          if (value && value.length < 200) {
            // Remove o label se estiver junto
            return value.split(':').pop()?.trim() || value;
          }
        }
      }
    }
    
    return '';
  },

  /**
   * Detecta unidade de medida
   */
  detectUnit(quantityStr: string, name: string): string {
    const text = (quantityStr + ' ' + name).toLowerCase();
    
    if (text.includes('kg') || text.includes('quilo')) return 'kg';
    if (text.includes('g') || text.includes('grama')) return 'g';
    if (text.includes('l') || text.includes('litro')) return 'l';
    if (text.includes('ml') || text.includes('mililitro')) return 'ml';
    
    return 'unidade';
  },

  /**
   * Normaliza nome do produto
   */
  normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\d+$/g, '') // Remove códigos no final
      .replace(/UN$|PCT$|KG$|G$/gi, '')
      .trim();
  }
};

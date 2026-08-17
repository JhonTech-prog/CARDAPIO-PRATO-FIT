import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import { ifoodService } from './ifoodService.js';
import { Ingredient, Recipe, StockMovement } from './ingredientModels.js';
import { ingredientService } from './ingredientService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexão MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pratofit';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Schema do Produto
const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  title: String,
  stock: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  receiptToken: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: 'confirmed' },
  customerName: String,
  fulfillmentType: String,
  cep: String,
  address: String,
  number: String,
  neighborhood: String,
  pickupTime: String,
  selectedKitName: String,
  selectedKitPrice: Number,
  deliveryFee: Number,
  totalPrice: Number,
  paymentMethod: String,
  observation: String,
  lowStockWarning: Boolean,
  reservationId: String,
  reservationExpiresAt: String,
  items: [{ title: String, quantity: Number }]
});

const Order = mongoose.model('Order', orderSchema);

// ================== ROTAS ==================

// GET - Health check (para manter servidor ativo)
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'PratoFit API - Sistema de Gestão de Estoque',
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// GET - Buscar todos os produtos (retorna apenas estoque)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    const stockMap = {};
    products.forEach(p => {
      stockMap[p.productId] = p.stock;
    });
    res.json({ success: true, data: stockMap });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Atualizar estoque (batch)
app.post('/api/products/stock', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items inválidos' });
    }

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { productId: item.id },
        update: { 
          $set: { 
            productId: item.id,
            title: item.title,
            stock: item.stock,
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    await Product.bulkWrite(bulkOps);

    // 🔄 SINCRONIZA AUTOMATICAMENTE COM O IFOOD
    if (process.env.IFOOD_ENABLED === 'true') {
      console.log('🔄 Sincronizando estoque com iFood...');
      ifoodService.syncStockToIfood(items).catch(err => {
        console.error('Erro ao sincronizar com iFood:', err);
      });
    }

    res.json({ success: true, message: 'Estoque atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar estoque de um produto específico
app.put('/api/products/:productId/stock', async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    const product = await Product.findOneAndUpdate(
      { productId },
      { stock, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar pedido e gerar link de cupom único
app.post('/api/orders', async (req, res) => {
  try {
    const payload = req.body;
    const receiptToken = crypto.randomUUID();
    const orderCode = `PF${Date.now()}`;

    const order = new Order({
      orderCode,
      receiptToken,
      status: 'pending_payment',
      customerName: payload.customerName,
      fulfillmentType: payload.fulfillmentType,
      cep: payload.cep,
      address: payload.address,
      number: payload.number,
      neighborhood: payload.neighborhood,
      pickupTime: payload.pickupTime,
      selectedKitName: payload.selectedKitName,
      selectedKitPrice: payload.selectedKitPrice,
      deliveryFee: payload.deliveryFee,
      totalPrice: payload.totalPrice,
      paymentMethod: payload.paymentMethod,
      observation: payload.observation,
      lowStockWarning: payload.lowStockWarning,
      reservationId: payload.reservationId,
      reservationExpiresAt: payload.reservationExpiresAt,
      items: payload.items || []
    });

    await order.save();

    const baseUrl = process.env.PUBLIC_URL || req.headers.origin || `http://localhost:${PORT}`;
    const receiptLink = `${baseUrl.replace(/\/$/, '')}/receipt?token=${encodeURIComponent(receiptToken)}`;

    res.status(201).json({ success: true, orderId: order._id, orderCode, receiptLink });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar pedido por token do cupom
app.get('/api/receipt', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    const order = await Order.findOne({ receiptToken: token }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao buscar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Decrementar estoque (quando cliente faz pedido)
app.post('/api/products/decrement', async (req, res) => {
  try {
    const { items } = req.body; // [{ id, quantity }]

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of items) {
        const product = await Product.findOne({ productId: item.id }).session(session);
        
        if (!product || product.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para ${item.id}`);
        }

        await Product.updateOne(
          { productId: item.id },
          { 
            $inc: { stock: -item.quantity },
            $set: { lastUpdated: new Date() }
          }
        ).session(session);

        // 🔄 DECREMENTA INSUMOS AUTOMATICAMENTE
        await ingredientService.decrementIngredientsForProduct(item.id, item.quantity);
      }

      await session.commitTransaction();
      res.json({ success: true, message: 'Estoque atualizado!' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Erro ao decrementar estoque:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== ROTAS DO IFOOD ==============

// POST - Webhook do iFood (recebe notificações de pedidos)
app.post('/api/ifood/webhook', async (req, res) => {
  try {
    const { eventType, orderId, items } = req.body;
    
    console.log(`📦 Webhook iFood recebido: ${eventType} - Pedido: ${orderId}`);
    
    // Quando há um pedido confirmado no iFood
    if (eventType === 'ORDER_CONFIRMED' || eventType === 'ORDER_PLACED') {
      const itemsToDecrement = await ifoodService.processIfoodOrder(req.body);
      
      // Decrementa o estoque local
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        for (const item of itemsToDecrement) {
          await Product.updateOne(
            { productId: item.id },
            { 
              $inc: { stock: -item.quantity },
              $set: { lastUpdated: new Date() }
            }
          ).session(session);
          
          console.log(`📉 Estoque decrementado: ${item.id} -${item.quantity}`);
        }
        
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }
    
    res.json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('Erro ao processar webhook iFood:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Sincronizar estoque com o iFood manualmente
app.post('/api/ifood/sync', async (req, res) => {
  try {
    const products = await Product.find();
    
    const items = products.map(p => ({
      id: p.productId,
      stock: p.stock
    }));
    
    const results = await ifoodService.syncStockToIfood(items);
    
    res.json({ 
      success: true, 
      message: 'Sincronização com iFood concluída',
      results 
    });
  } catch (error) {
    console.error('Erro ao sincronizar com iFood:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar catálogo do iFood
app.get('/api/ifood/catalog', async (req, res) => {
  try {
    const catalog = await ifoodService.getIfoodCatalog();
    res.json({ success: true, data: catalog });
  } catch (error) {
    console.error('Erro ao buscar catálogo iFood:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar mapeamento produto local <-> iFood
app.post('/api/ifood/mapping', async (req, res) => {
  try {
    const { localId, ifoodId } = req.body;
    await ifoodService.setProductMapping(localId, ifoodId);
    res.json({ success: true, message: 'Mapeamento criado' });
  } catch (error) {
    console.error('Erro ao criar mapeamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== ROTAS DE GESTÃO DE INSUMOS ==============

// GET - Listar todos os ingredientes
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Erro ao buscar ingredientes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo ingrediente
app.post('/api/ingredients', async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    console.log(`✅ Ingrediente criado: ${ingredient.name}`);
    res.json({ success: true, data: ingredient });
  } catch (error) {
    console.error('Erro ao criar ingrediente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar ingrediente
app.put('/api/ingredients/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true }
    );
    res.json({ success: true, data: ingredient });
  } catch (error) {
    console.error('Erro ao atualizar ingrediente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Limpar todos os ingredientes (resetar banco) - DEVE VIR ANTES DE :id
app.delete('/api/ingredients/clear/all', async (req, res) => {
  try {
    const deletedIngredients = await Ingredient.deleteMany({});
    const deletedRecipes = await Recipe.deleteMany({});
    const deletedMovements = await StockMovement.deleteMany({});
    
    res.json({ 
      success: true, 
      message: 'Banco de dados limpo com sucesso',
      deleted: {
        ingredients: deletedIngredients.deletedCount,
        recipes: deletedRecipes.deletedCount,
        movements: deletedMovements.deletedCount
      }
    });
  } catch (error) {
    console.error('Erro ao limpar banco:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Deletar ingrediente
app.delete('/api/ingredients/:id', async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ingrediente deletado' });
  } catch (error) {
    console.error('Erro ao deletar ingrediente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Adicionar estoque de ingrediente (entrada/compra)
app.post('/api/ingredients/:id/add-stock', async (req, res) => {
  try {
    const { quantity, reason, unitCost, totalCost, source, supplier, invoiceNumber } = req.body;
    
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ success: false, error: 'Ingrediente não encontrado' });
    }

    // Atualiza estoque
    ingredient.currentStock += quantity;
    
    // Atualiza custo médio ponderado se fornecido
    if (unitCost && unitCost > 0) {
      const oldStock = ingredient.currentStock - quantity;
      const oldValue = oldStock * (ingredient.cost || 0);
      const newValue = quantity * unitCost;
      ingredient.cost = (oldValue + newValue) / ingredient.currentStock;
    }
    
    ingredient.lastUpdated = new Date();
    await ingredient.save();

    // Registra movimentação no histórico
    await StockMovement.create({
      ingredientId: ingredient._id,
      ingredientName: ingredient.name,
      type: 'entrada',
      quantity,
      unitCost: unitCost || 0,
      totalCost: totalCost || (quantity * (unitCost || 0)),
      source: source || 'manual',
      supplier,
      invoiceNumber,
      reason,
      timestamp: new Date()
    });

    console.log(`✅ Estoque atualizado: ${ingredient.name} +${quantity}${ingredient.unit}`);
    res.json({ success: true, data: ingredient });
  } catch (error) {
    console.error('Erro ao adicionar estoque:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Alertas de estoque baixo
app.get('/api/ingredients/alerts', async (req, res) => {
  try {
    const alerts = await ingredientService.checkLowStockAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Registrar entrada em lote (nota fiscal completa)
app.post('/api/stock-entries/bulk', async (req, res) => {
  try {
    const { supplier, invoiceNumber, date, items, source } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum item fornecido' });
    }

    const results = [];
    
    for (const item of items) {
      try {
        // Normaliza nome do ingrediente
        const normalizedName = item.name.toLowerCase().trim();
        
        // Extrai primeira palavra para busca inteligente (ex: "arroz chines" -> "arroz")
        const firstWord = normalizedName.split(/\s+/)[0];
        
        // Busca ingrediente de 3 formas (da mais específica para mais genérica):
        // 1. Nome exato
        let ingredient = await Ingredient.findOne({ 
          name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } 
        });
        
        // 2. Se não encontrou, busca pela primeira palavra
        if (!ingredient && firstWord.length >= 3) {
          ingredient = await Ingredient.findOne({ 
            name: { $regex: new RegExp(`^${firstWord}`, 'i') } 
          });
          
          if (ingredient) {
            console.log(`🔗 Match inteligente: "${item.name}" -> "${ingredient.name}"`);
          }
        }
        
        // 3. Se ainda não encontrou, busca se o nome contém a primeira palavra
        if (!ingredient && firstWord.length >= 3) {
          ingredient = await Ingredient.findOne({ 
            name: { $regex: new RegExp(firstWord, 'i') } 
          });
          
          if (ingredient) {
            console.log(`🔗 Match parcial: "${item.name}" -> "${ingredient.name}"`);
          }
        }

        if (!ingredient) {
          // Cria novo ingrediente
          ingredient = await Ingredient.create({
            name: item.name,
            category: 'outro',
            unit: (item.unit || 'unidade').toLowerCase(),
            currentStock: 0,
            minStock: 1,
            cost: 0,
            lastUpdated: new Date()
          });
          console.log(`📦 Novo ingrediente criado: ${ingredient.name}`);
        }

        // Atualiza estoque
        const oldStock = ingredient.currentStock;
        
        // Converte quantidade para a unidade do ingrediente
        let quantityToAdd = item.quantity;
        const itemUnit = (item.unit || 'unidade').toLowerCase();
        const ingredientUnit = ingredient.unit.toLowerCase();
        
        // Conversão kg <-> g
        if (itemUnit === 'kg' && ingredientUnit === 'g') {
          quantityToAdd = item.quantity * 1000;
          console.log(`🔄 Conversão: ${item.quantity}kg -> ${quantityToAdd}g`);
        } else if (itemUnit === 'g' && ingredientUnit === 'kg') {
          quantityToAdd = item.quantity / 1000;
          console.log(`🔄 Conversão: ${item.quantity}g -> ${quantityToAdd}kg`);
        }
        // Conversão l <-> ml
        else if (itemUnit === 'l' && ingredientUnit === 'ml') {
          quantityToAdd = item.quantity * 1000;
          console.log(`🔄 Conversão: ${item.quantity}l -> ${quantityToAdd}ml`);
        } else if (itemUnit === 'ml' && ingredientUnit === 'l') {
          quantityToAdd = item.quantity / 1000;
          console.log(`🔄 Conversão: ${item.quantity}ml -> ${quantityToAdd}l`);
        }
        
        ingredient.currentStock += quantityToAdd;
        
        // Atualiza custo médio ponderado
        if (item.unitCost && item.unitCost > 0) {
          const oldValue = oldStock * (ingredient.cost || 0);
          const newValue = item.quantity * item.unitCost;
          ingredient.cost = (oldValue + newValue) / ingredient.currentStock;
        }
        
        ingredient.lastUpdated = new Date();
        await ingredient.save();

        // Registra movimentação
        await StockMovement.create({
          ingredientId: ingredient._id,
          ingredientName: ingredient.name,
          type: 'entrada',
          quantity: quantityToAdd,
          unitCost: item.unitCost || 0,
          totalCost: item.totalCost || (item.quantity * (item.unitCost || 0)),
          source: source || 'cupom_fiscal',
          supplier,
          invoiceNumber,
          reason: `Entrada via nota fiscal ${invoiceNumber}`,
          timestamp: new Date()
        });

        results.push({
          success: true,
          ingredient: ingredient.name,
          quantity: item.quantity
        });
        
        console.log(`✅ ${ingredient.name}: +${item.quantity}${ingredient.unit}`);
      } catch (itemError) {
        console.error(`❌ Erro ao processar ${item.name}:`, itemError);
        results.push({
          success: false,
          ingredient: item.name,
          error: itemError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📋 Entrada registrada: ${successCount}/${items.length} itens | ${supplier}`);
    
    res.json({ 
      success: true, 
      message: `${successCount} de ${items.length} itens registrados`,
      results 
    });
  } catch (error) {
    console.error('Erro ao registrar entrada em lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Alertas de estoque baixo (duplicado removido)
app.get('/api/ingredients/alerts-old', async (req, res) => {
  try {
    const alerts = await ingredientService.checkLowStockAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== ROTAS DE RECEITAS ==============

// GET - Listar todas as receitas
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find().populate('ingredients.ingredientId');
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar receita de um produto específico
app.get('/api/recipes/:productId', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ productId: req.params.productId })
      .populate('ingredients.ingredientId');
    
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Receita não encontrada' });
    }
    
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Erro ao buscar receita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar nova receita
app.post('/api/recipes', async (req, res) => {
  try {
    const recipe = await Recipe.create(req.body);
    console.log(`✅ Receita criada para: ${recipe.productName}`);
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar receita
app.put('/api/recipes/:productId', async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndUpdate(
      { productId: req.params.productId },
      { ...req.body, lastUpdated: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Calcular custo de produção
app.get('/api/recipes/:productId/cost', async (req, res) => {
  try {
    const result = await ingredientService.calculateProductionCost(req.params.productId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao calcular custo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Verificar disponibilidade de insumos
app.post('/api/recipes/:productId/check-availability', async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await ingredientService.checkIngredientsAvailability(
      req.params.productId,
      quantity || 1
    );
    res.json(result);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== ROTAS DE HISTÓRICO ==============

// GET - Histórico de movimentações
app.get('/api/stock-movements', async (req, res) => {
  try {
    const { ingredientId, startDate, endDate, limit = 100 } = req.query;
    
    const query = {};
    if (ingredientId) query.ingredientId = ingredientId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const movements = await StockMovement.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('ingredientId');
    
    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Proxy para buscar NFC-e da SEFAZ (evita CORS)
app.post('/api/nfce/fetch', async (req, res) => {
  try {
    const { accessKey, state } = req.body;
    
    if (!accessKey || accessKey.length !== 44) {
      return res.status(400).json({ success: false, error: 'Chave de acesso inválida' });
    }

    console.log(`🔍 Buscando NFC-e: ${accessKey}`);
    
    // Detecta o estado pela chave de acesso (posições 0-1)
    const stateCode = accessKey.substring(0, 2);
    console.log(`📍 Estado detectado: ${stateCode}`);
    
    // Para Paraíba (25), usar formato específico
    if (stateCode === '25') {
      const chave = accessKey;
      
      // URLs para tentar na Paraíba
      const pbUrls = [
        `https://www.sefaz.pb.gov.br/nfce/qrcode?p=${chave}|2|1|1|`,
        `http://www.sefaz.pb.gov.br/nfce/qrcode?p=${chave}|2|1|1|`,
        `https://www.sefaz.pb.gov.br/nfceweb/consultarNFCe.xhtml?p=${chave}`,
        `https://www19.receita.fazenda.pb.gov.br/nfceweb/consultarNFCe.xhtml?chNFe=${chave}`
      ];
      
      let lastError = null;
      
      for (const url of pbUrls) {
        try {
          console.log(`🔗 Tentando PB: ${url.substring(0, 60)}...`);
          
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: 60000, // 60 segundos
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Aceita redirects
          });
          
          console.log(`📊 Status: ${response.status}, Tamanho: ${response.data?.length || 0} bytes`);
          
          if (response.data && response.data.length > 100) {
            console.log(`✅ Sucesso com: ${url}`);
            return res.json({ 
              success: true, 
              html: response.data, 
              url: url,
              stateCode: stateCode
            });
          }
        } catch (err) {
          lastError = err;
          console.log(`❌ Falhou: ${err.message}`);
        }
      }
      
      // Se nenhuma URL funcionou
      throw new Error(`Não foi possível acessar a SEFAZ-PB. Último erro: ${lastError?.message || 'Desconhecido'}`);
    }
    
    // Para outros estados
    const sefazUrls = {
      '26': 'https://www.sefaz.pe.gov.br/nfce/consulta',
      '35': 'https://www.fazenda.sp.gov.br/nfce/consulta',
      '53': 'https://www.nfce.fazenda.df.gov.br/consulta',
      '33': 'https://www.nfce.fazenda.rj.gov.br/consulta',
      '41': 'https://www.fazenda.pr.gov.br/nfce/consulta',
      '43': 'https://www.sefaz.rs.gov.br/nfce/consulta',
      '31': 'https://www.fazenda.mg.gov.br/nfce/consulta',
      '29': 'https://www.sefaz.ba.gov.br/nfce/consulta',
      '23': 'https://www.sefaz.ce.gov.br/nfce/consulta'
    };
    
    const baseUrl = sefazUrls[stateCode];
    
    if (!baseUrl) {
      throw new Error(`Estado ${stateCode} não suportado ainda`);
    }
    
    const response = await axios.get(`${baseUrl}?chNFe=${accessKey}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000
    });

    res.json({ 
      success: true, 
      html: response.data, 
      url: `${baseUrl}?chNFe=${accessKey}`,
      stateCode 
    });
    
  } catch (error) {
    console.error('❌ Erro completo:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: `Erro ao buscar nota: ${error.message}`,
      details: error.response?.data || error.message,
      code: error.code
    });
  }
});

// GET - Teste de busca NFC-e (debug)
app.get('/api/nfce/test/:chave?', async (req, res) => {
  const chave = req.params.chave || '25260112919734000310631130004299751631829541';
  
  try {
    const url = `https://www.sefaz.pb.gov.br/nfce/qrcode?p=${chave}|2|1|1|`;
    console.log('🧪 Testando:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 60000, // 60 segundos
      maxRedirects: 5
    });
    
    res.json({
      success: true,
      status: response.status,
      tamanho: response.data?.length,
      primeiros200: response.data?.substring(0, 200),
      contemNFCe: response.data?.includes('NFC-e') || response.data?.includes('nfce'),
      contemErro: response.data?.includes('erro') || response.data?.includes('inválid')
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      code: error.code,
      status: error.response?.status
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

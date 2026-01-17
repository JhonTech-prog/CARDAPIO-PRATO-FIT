import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
        
        // Busca ou cria ingrediente
        let ingredient = await Ingredient.findOne({ 
          name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } 
        });

        if (!ingredient) {
          // Cria novo ingrediente
          ingredient = await Ingredient.create({
            name: item.name,
            category: 'outros',
            unit: item.unit || 'unidade',
            currentStock: 0,
            minStock: 1,
            cost: 0,
            lastUpdated: new Date()
          });
          console.log(`📦 Novo ingrediente criado: ${ingredient.name}`);
        }

        // Atualiza estoque
        const oldStock = ingredient.currentStock;
        ingredient.currentStock += item.quantity;
        
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
          quantity: item.quantity,
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

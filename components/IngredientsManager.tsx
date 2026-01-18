
import React, { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, TrendingDown, Search, Upload, Camera, Sparkles, Receipt, DollarSign, QrCode } from 'lucide-react';
import { recipeOCRService } from '../services/recipeOCRService';
import { invoiceOCRService } from '../services/invoiceOCRService';
import { nfceService } from '../services/nfceService';
// import QRCodeScanner from './QRCodeScanner'; // Removido temporariamente

interface Ingredient {
  _id?: string;
  name: string;
  description?: string;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'unidade';
  currentStock: number;
  minStock: number;
  cost: number;
  supplier?: string;
  category: 'proteina' | 'carboidrato' | 'vegetal' | 'tempero' | 'acompanhamento' | 'outro';
}

interface Recipe {
  productId: string;
  productName: string;
  ingredients: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
  }[];
  portionSize?: number;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const IngredientsManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'ocr' | 'stock-entry'>('ingredients');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [alerts, setAlerts] = useState<Ingredient[]>([]);
  
  // OCR State (receitas)
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Invoice OCR State (cupom fiscal)
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [invoiceProcessing, setInvoiceProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Form states
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    name: '',
    unit: 'g',
    currentStock: 0,
    minStock: 0,
    cost: 0,
    category: 'outro'
  });

  useEffect(() => {
    loadIngredients();
    loadRecipes();
    loadAlerts();
  }, []);

  const loadIngredients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ingredients`);
      const data = await response.json();
      if (data.success) setIngredients(data.data);
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recipes`);
      const data = await response.json();
      if (data.success) setRecipes(data.data);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ingredients/alerts`);
      const data = await response.json();
      if (data.success) setAlerts(data.data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
    }
  };

  const handleAddIngredient = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient)
      });
      
      const data = await response.json();
      if (data.success) {
        loadIngredients();
        setShowAddForm(false);
        setNewIngredient({
          name: '',
          unit: 'g',
          currentStock: 0,
          minStock: 0,
          cost: 0,
          category: 'outro'
        });
        alert('Ingrediente adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao adicionar ingrediente:', error);
      alert('Erro ao adicionar ingrediente');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setOcrImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOCR = async () => {
    if (!ocrImage || !selectedProductId) {
      alert('Selecione uma imagem e um produto');
      return;
    }

    setOcrProcessing(true);
    try {
      const result = await recipeOCRService.extractRecipeFromImage(ocrImage, selectedProductId);
      
      if (result.success) {
        setOcrResult(result.data);
        alert('Receita extraída com sucesso! Revise os dados antes de salvar.');
      } else {
        alert('Erro ao processar imagem: ' + result.error);
      }
    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('Erro ao processar imagem');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSaveOCRRecipe = async () => {
    if (!ocrResult) return;

    try {
      // Primeiro, busca todos os ingredientes do banco
      const ingredientsResponse = await fetch(`${API_URL}/api/ingredients`);
      const ingredientsData = await ingredientsResponse.json();
      const existingIngredients = Array.isArray(ingredientsData) ? ingredientsData : (ingredientsData.data || []);
      
      console.log('Ingredientes existentes:', existingIngredients);
      
      // Mapeia nome -> ID, criando ingredientes novos se necessário
      // Helper function to normalize unit values
      const normalizeUnit = (unit: string): string => {
        const unitLower = unit.toLowerCase().trim();
        // Map plural to singular and variations
        const unitMap: { [key: string]: string } = {
          'unidades': 'unidade',
          'gramas': 'g',
          'grama': 'g',
          'quilos': 'kg',
          'quilo': 'kg',
          'litros': 'l',
          'litro': 'l',
          'mililitros': 'ml',
          'mililitro': 'ml',
        };
        
        return unitMap[unitLower] || unitLower;
      };

      const ingredientsWithIds = await Promise.all(
        ocrResult.ingredients.map(async (ing: any) => {
          // Normaliza o nome para comparação (minúsculo, sem acentos)
          const normalizedName = ing.name.toLowerCase().trim();
          
          // Normaliza a unidade de medida
          const normalizedUnit = normalizeUnit(ing.unit);
          
          // Busca ingrediente existente
          let ingredient = existingIngredients.find((existing: any) => 
            existing.name.toLowerCase().trim() === normalizedName
          );
          
          // Se não existe, cria automaticamente
          if (!ingredient) {
            console.log(`Criando ingrediente: ${ing.name} (${normalizedUnit})`);
            try {
              const createResponse = await fetch(`${API_URL}/api/ingredients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: ing.name,
                  unit: normalizedUnit,
                  currentStock: 0,
                  minStock: 100,
                  cost: 0,
                  category: 'outro'
                })
              });
              
              const created = await createResponse.json();
              
              if (!createResponse.ok || !created.success) {
                console.error(`❌ Erro ao criar ${ing.name}:`, created.error);
                // If creation failed, try to fetch again in case it was created by another parallel request
                const refetchResponse = await fetch(`${API_URL}/api/ingredients`);
                const refetchData = await refetchResponse.json();
                const refetchIngredients = Array.isArray(refetchData) ? refetchData : (refetchData.data || []);
                ingredient = refetchIngredients.find((existing: any) => 
                  existing.name.toLowerCase().trim() === normalizedName
                );
                
                if (!ingredient) {
                  throw new Error(`Falha ao criar ingrediente ${ing.name}: ${created.error || 'Unknown error'}`);
                }
                console.log(`✅ Ingrediente ${ing.name} encontrado após retry`);
              } else {
                ingredient = created.data;
                console.log(`✅ Ingrediente ${ing.name} criado com sucesso`);
              }
            } catch (error) {
              console.error(`❌ Erro crítico ao criar ${ing.name}:`, error);
              throw error;
            }
          }
          
          // Validate ingredient exists before accessing _id
          if (!ingredient || !ingredient._id) {
            throw new Error(`Ingrediente ${ing.name} não foi criado corretamente`);
          }
          
          return {
            ingredientId: ingredient._id,
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: normalizedUnit
          };
        })
      );
      
      // Agora salva a receita com os IDs corretos
      console.log('Enviando receita para:', `${API_URL}/api/recipes`);
      console.log('Dados:', { productId: selectedProductId, ingredients: ingredientsWithIds });
      
      const response = await fetch(`${API_URL}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          productName: ocrResult.productName,
          portionSize: ocrResult.portionSize,
          ingredients: ingredientsWithIds
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (data.success) {
        alert('Receita salva com sucesso!');
        loadRecipes();
        setOcrResult(null);
        setOcrImage(null);
      } else {
        alert('Erro ao salvar: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Erro ao salvar receita:', error);
      alert('Erro ao salvar receita: ' + error.message);
    }
  };

  // ============ FUNÇÕES CUPOM FISCAL ============
  
  const handleInvoiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setInvoiceImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessInvoice = async () => {
    if (!invoiceImage) {
      alert('Selecione uma imagem do cupom fiscal');
      return;
    }

    setInvoiceProcessing(true);
    try {
      const result = await invoiceOCRService.extractInvoiceData(invoiceImage);
      
      // Valida se há produtos
      if (!result.items || result.items.length === 0) {
        setInvoiceData(result);
        alert('⚠️ ATENÇÃO: Nenhum produto foi detectado na foto!\n\n' +
              'A foto deve mostrar a LISTA DE PRODUTOS (parte do meio do cupom).\n\n' +
              '💡 MELHOR OPÇÃO: Use "Escanear QR Code" para ter 100% de precisão!');
        return;
      }
      
      setInvoiceData(result);
      alert(`✅ Cupom processado com sucesso!\n\n` +
            `${result.items.length} produto(s) detectado(s)\n` +
            `Total: R$ ${result.totalValue?.toFixed(2)}\n\n` +
            `Revise os dados antes de salvar.`);
    } catch (error: any) {
      console.error('Erro ao processar cupom:', error);
      alert(`Erro ao processar cupom: ${error.message}`);
    } finally {
      setInvoiceProcessing(false);
    }
  };

  const handleSaveInvoiceEntries = async () => {
    if (!invoiceData || !invoiceData.items) {
      alert('Nenhum dado para salvar');
      return;
    }

    try {
      // Para cada item do cupom, criar movimentação de estoque
      for (const item of invoiceData.items) {
        // Busca ou cria o ingrediente
        const normalizedName = item.name.toLowerCase().trim();
        let ingredient = ingredients.find(ing => 
          ing.name.toLowerCase().trim() === normalizedName
        );

        if (!ingredient) {
          // Cria novo ingrediente automaticamente
          const createResponse = await fetch(`${API_URL}/api/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.name,
              unit: item.unit,
              currentStock: 0,
              minStock: 100,
              cost: item.unitCost,
              category: 'outro'
            })
          });
          
          const created = await createResponse.json();
          if (created.success) {
            ingredient = created.data;
          }
        }

        if (ingredient) {
          // Registra entrada de estoque
          await fetch(`${API_URL}/api/ingredients/${ingredient._id}/add-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              source: 'cupom_fiscal',
              supplier: invoiceData.supplier,
              invoiceNumber: invoiceData.invoiceNumber,
              reason: `Compra ${invoiceData.date}`
            })
          });
        }
      }

      alert('Entrada de estoque registrada com sucesso!');
      loadIngredients();
      setInvoiceData(null);
      setInvoiceImage(null);
    } catch (error: any) {
      console.error('Erro ao salvar entrada:', error);
      alert(`Erro ao salvar entrada: ${error.message}`);
    }
  };

  // Handler para QR Code
  const handleQRCodeScan = async (qrCodeData: string) => {
    setShowQRScanner(false);
    setInvoiceProcessing(true);
    
    try {
      console.log('🔍 Processando QR Code da NFC-e...');
      const data = await nfceService.processQRCode(qrCodeData);
      setInvoiceData(data);
      alert('✅ Nota fiscal processada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao processar QR Code:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setInvoiceProcessing(false);
    }
  };

  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
              <Package className="text-emerald-600" /> Gestão de Insumos
            </h1>
            <p className="text-gray-500 text-sm mt-2">Controle de ingredientes e receitas</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕ Fechar
          </button>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-orange-600" size={20} />
              <h3 className="font-bold text-orange-800">Alertas de Estoque Baixo</h3>
            </div>
            <div className="space-y-1">
              {alerts.map(ing => (
                <p key={ing._id} className="text-sm text-orange-700">
                  • {ing.name}: {ing.currentStock}{ing.unit} (mínimo: {ing.minStock}{ing.unit})
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'ingredients'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ingredientes
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-6 py-3 font-bold transition-colors ${
              activeTab === 'recipes'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'ocr'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={18} /> Ler Receita (IA)
          </button>
          <button
            onClick={() => setActiveTab('stock-entry')}
            className={`px-6 py-3 font-bold transition-colors flex items-center gap-2 ${
              activeTab === 'stock-entry'
                ? 'border-b-2 border-emerald-600 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt size={18} /> Entrada de Estoque
          </button>
        </div>

        {/* Content */}
        {activeTab === 'ingredients' && (
          <div>
            {/* Search and Add */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar ingrediente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2"
              >
                <Plus size={20} /> Novo Ingrediente
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                <h3 className="font-bold text-lg mb-4">Novo Ingrediente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                    className="border rounded-lg px-3 py-2"
                  />
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value as any })}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="g">Gramas (g)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="l">Litros (l)</option>
                    <option value="unidade">Unidade</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Estoque atual"
                    value={newIngredient.currentStock}
                    onChange={(e) => setNewIngredient({ ...newIngredient, currentStock: Number(e.target.value) })}
                    className="border rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Estoque mínimo"
                    value={newIngredient.minStock}
                    onChange={(e) => setNewIngredient({ ...newIngredient, minStock: Number(e.target.value) })}
                    className="border rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Custo (R$/kg ou /unidade)"
                    value={newIngredient.cost}
                    onChange={(e) => setNewIngredient({ ...newIngredient, cost: Number(e.target.value) })}
                    className="border rounded-lg px-3 py-2"
                  />
                  <select
                    value={newIngredient.category}
                    onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value as any })}
                    className="border rounded-lg px-3 py-2"
                  >
                    <option value="proteina">Proteína</option>
                    <option value="carboidrato">Carboidrato</option>
                    <option value="vegetal">Vegetal</option>
                    <option value="tempero">Tempero</option>
                    <option value="acompanhamento">Acompanhamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddIngredient}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Ingredients List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Ingrediente</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Estoque</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Mínimo</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Custo</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredIngredients.map((ing) => (
                    <tr key={ing._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {ing.currentStock <= ing.minStock && (
                            <TrendingDown className="text-orange-500" size={18} />
                          )}
                          <span className="font-bold">{ing.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={ing.currentStock <= ing.minStock ? 'text-orange-600 font-bold' : ''}>
                          {ing.currentStock}{ing.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{ing.minStock}{ing.unit}</td>
                      <td className="px-6 py-4">R$ {ing.cost.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full uppercase font-bold">
                          {ing.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div>
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="font-bold text-lg mb-4">Receitas Cadastradas</h3>
              {recipes.length === 0 ? (
                <p className="text-gray-500">Nenhuma receita cadastrada ainda.</p>
              ) : (
                <div className="space-y-4">
                  {recipes.map((recipe) => {
                    // Calcula custo total da receita
                    let totalCost = 0;
                    recipe.ingredients.forEach(ing => {
                      const ingredient = ingredients.find(i => i._id === ing.ingredientId);
                      if (ingredient) {
                        // Converte quantidade para a mesma unidade do custo
                        let quantityInBaseUnit = ing.quantity;
                        if (ing.unit === 'g' && ingredient.unit === 'kg') {
                          quantityInBaseUnit = ing.quantity / 1000;
                        } else if (ing.unit === 'ml' && ingredient.unit === 'l') {
                          quantityInBaseUnit = ing.quantity / 1000;
                        } else if (ing.unit === 'kg' && ingredient.unit === 'g') {
                          quantityInBaseUnit = ing.quantity * 1000;
                        } else if (ing.unit === 'l' && ingredient.unit === 'ml') {
                          quantityInBaseUnit = ing.quantity * 1000;
                        }
                        totalCost += quantityInBaseUnit * (ingredient.cost || 0);
                      }
                    });

                    return (
                      <div key={recipe.productId} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-lg">{recipe.productName}</h4>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Custo de Produção</p>
                            <p className="text-xl font-bold text-emerald-600">R$ {totalCost.toFixed(2)}</p>
                            {recipe.portionSize && (
                              <p className="text-xs text-gray-500">({recipe.portionSize}g por porção)</p>
                            )}
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          {recipe.ingredients.map((ing, idx) => {
                            const ingredient = ingredients.find(i => i._id === ing.ingredientId);
                            let itemCost = 0;
                            if (ingredient) {
                              let quantityInBaseUnit = ing.quantity;
                              if (ing.unit === 'g' && ingredient.unit === 'kg') {
                                quantityInBaseUnit = ing.quantity / 1000;
                              } else if (ing.unit === 'ml' && ingredient.unit === 'l') {
                                quantityInBaseUnit = ing.quantity / 1000;
                              }
                              itemCost = quantityInBaseUnit * (ingredient.cost || 0);
                            }
                            return (
                              <div key={idx} className="flex justify-between text-gray-600">
                                <span>• {ing.ingredientName}: {ing.quantity}{ing.unit}</span>
                                <span className="text-emerald-600 font-semibold">R$ {itemCost.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ocr' && (
          <div>
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Camera /> Ler Receita do Caderno com IA
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Tire uma foto da receita escrita à mão e a IA vai extrair automaticamente os ingredientes e quantidades!
              </p>

              {/* Seleção de Produto */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Produto:</label>
                <input
                  type="text"
                  placeholder="Ex: fit-tradicional"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              {/* Upload de Imagem */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Foto da Receita:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              {/* Preview da Imagem */}
              {ocrImage && (
                <div className="mb-6">
                  <img
                    src={`data:image/jpeg;base64,${ocrImage}`}
                    alt="Preview"
                    className="max-w-md rounded-lg border"
                  />
                </div>
              )}

              {/* Botão Processar */}
              <button
                onClick={handleProcessOCR}
                disabled={!ocrImage || !selectedProductId || ocrProcessing}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ocrProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Extrair Receita com IA
                  </>
                )}
              </button>

              {/* Resultado */}
              {ocrResult && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-bold text-lg mb-4">Receita Extraída:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-bold mb-2">{ocrResult.productName}</p>
                    <p className="text-sm text-gray-600 mb-3">Porção: {ocrResult.portionSize}g</p>
                    <div className="space-y-2">
                      {ocrResult.ingredients.map((ing: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{ing.name}</span>
                          <span className="font-bold">{ing.quantity}{ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveOCRRecipe}
                    className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700"
                  >
                    Salvar Receita
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Entrada de Estoque */}
        {activeTab === 'stock-entry' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Receipt className="text-emerald-600" size={28} />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Entrada de Estoque</h2>
                  <p className="text-gray-500 text-sm">Registre entradas via cupom fiscal ou manual</p>
                </div>
              </div>

              {/* Opções de entrada */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* QR Code NFC-e (RECOMENDADO) */}
                <div className="border-2 border-dashed border-emerald-300 rounded-lg p-6 hover:border-emerald-500 transition-colors bg-emerald-50">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="text-emerald-600" size={20} />
                    <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold">✨ MELHOR OPÇÃO</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    Escanear QR Code
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Tire foto APENAS do QR Code (quadradinho preto). Dados 100% precisos direto da SEFAZ!
                  </p>
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 w-full"
                  >
                    <QrCode size={18} className="inline mr-2" />
                    Escanear QR Code
                  </button>
                </div>

                {/* Cupom Fiscal OCR */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-orange-500 transition-colors">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Camera className="text-orange-600" size={20} />
                    Foto do Cupom (IA)
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    ⚠️ Tire foto mostrando a <strong>LISTA DE PRODUTOS</strong> (parte do meio)
                  </p>
                  <p className="text-xs text-orange-600 mb-4">
                    Menos preciso - pode não detectar todos os itens
                  </p>
                  <label className="cursor-pointer bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 inline-block w-full text-center">
                    <Upload size={18} className="inline mr-2" />
                    Upload Foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInvoiceImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Entrada Manual */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <DollarSign className="text-blue-600" size={20} />
                    Entrada Manual
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Para EMPASA, feiras, etc. Adicione quantidade e valor manualmente
                  </p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 w-full">
                    <Plus size={18} className="inline mr-2" />
                    Adicionar
                  </button>
                </div>
              </div>

              {/* QR Code Scanner Modal */}
              {/* {showQRScanner && (
                <QRCodeScanner
                  onScan={handleQRCodeScan}
                  onClose={() => setShowQRScanner(false)}
                />
              )} */}

              {/* Processing indicator */}
              {invoiceProcessing && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <div>
                      <p className="font-bold text-emerald-700">Processando nota fiscal...</p>
                      <p className="text-sm text-emerald-600">Buscando dados da SEFAZ</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview da imagem do cupom */}
              {invoiceImage && (
                <div className="mb-6">
                  <h3 className="font-bold mb-2">Cupom Fiscal Carregado:</h3>
                  <img 
                    src={invoiceImage} 
                    alt="Cupom fiscal" 
                    className="max-w-md rounded-lg border shadow-lg"
                  />
                  {!invoiceProcessing && !invoiceData && (
                    <button
                      onClick={handleProcessInvoice}
                      className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <Sparkles size={18} />
                      Processar com IA
                    </button>
                  )}
                  {invoiceProcessing && (
                    <div className="mt-4 text-emerald-600 font-bold animate-pulse">
                      ⏳ Processando cupom fiscal com IA...
                    </div>
                  )}
                </div>
              )}

              {/* Resultado do OCR do cupom */}
              {invoiceData && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="font-bold text-lg mb-4 text-emerald-700">✅ Cupom Processado!</h3>
                  
                  <div className="mb-4 grid md:grid-cols-3 gap-4 bg-white p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Fornecedor</p>
                      <p className="font-bold">{invoiceData.supplier}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Data</p>
                      <p className="font-bold">{invoiceData.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Valor Total</p>
                      <p className="font-bold text-emerald-600">R$ {invoiceData.totalValue?.toFixed(2)}</p>
                    </div>
                  </div>

                  <h4 className="font-bold mb-3">Itens Detectados:</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {invoiceData.items?.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} {item.unit} × R$ {item.unitCost?.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">R$ {item.totalCost?.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setInvoiceData(null);
                        setInvoiceImage(null);
                      }}
                      className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600"
                    >
                      ❌ Cancelar
                    </button>
                    <button
                      onClick={handleSaveInvoiceEntries}
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700"
                    >
                      💾 Registrar Entrada
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientsManager;


import { MenuItem, KitDefinition } from './types';

export interface DeliveryZone {
  price: number;
  label: string;
  neighborhoods: string[];
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    price: 7.00,
    label: 'Zona Sul/Leste (Próximos)',
    neighborhoods: ['Catolé', 'Sandra Cavalcante', 'Mirante', 'Itararé', 'Vila Cabral', 'Jardim Paulistano', 'Tambor', 'Liberdade', 'Cruzeiro']
  },
  {
    price: 9.00,
    label: 'Zona Central/Norte',
    neighborhoods: ['Centro', 'Prata', 'São José', 'Alto Branco', 'Jardim Tavares', 'Lauritzen', 'Santo Antônio', 'Monte Santo', 'Universitário', 'Bela Vista', 'Estação Velha']
  },
  {
    price: 12.00,
    label: 'Zonas Afastadas',
    neighborhoods: ['Malvinas', 'Bodocongó', 'Dinamérica', 'Três Irmãs', 'Serrotão', 'Catingueira', 'Velame', 'Distrito Industrial', 'Aluízio Campos', 'Santa Rosa', 'Bairro das Cidades']
  }
];

export const PICKUP_INFO = {
  address: "Rua Maria Minervina, 375 - Catolé",
  city: "Campina Grande - PB",
  hours: "Segunda a Sexta: 09h às 18h | Sábado: 09h às 13h",
  mapsLink: "https://www.google.com/maps/search/?api=1&query=PratoFit+Rua+Maria+Minervina"
};

export const KITS: KitDefinition[] = [
  {
    id: 'unit',
    name: 'Unidade Avulsa',
    totalMeals: 1,
    price: 25.00,
    pricePerMeal: 25.00,
    description: 'Ideal para experimentar'
  },
  {
    id: 'kit5',
    name: 'Kit 5 Refeições',
    totalMeals: 5,
    price: 85.00,
    pricePerMeal: 17.00,
    description: 'Garanta o almoço da semana',
    highlight: true
  },
  {
    id: 'kit10',
    name: 'Kit 10 Refeições',
    totalMeals: 10,
    price: 160.00,
    pricePerMeal: 16.00,
    description: 'Praticidade para 15 dias'
  },
  {
    id: 'kit20',
    name: 'Kit 20 Refeições',
    totalMeals: 20,
    price: 300.00,
    pricePerMeal: 15.00,
    description: 'O melhor custo-benefício'
  }
];

export const IFOOD_LINK = "https://www.ifood.com.br/delivery/campina-grande-pb/pratofit-fale";

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    externalProductId: '1',
    title: 'Bobó de Frango',
    description: 'Cremoso bobó de frango feito with macaxeira fresca e leite de coco. Acompanha arroz branco soltinho.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151100_03UX_i.jpg', 
    category: 'Marmitas PratoFit',
    tags: ['Frango', 'Cremoso'],
    stock: 15,
    available: true
  },
  {
    id: '2',
    externalProductId: '2',
    title: 'Escondidinho de Frango com Batata Doce',
    description: 'Purê aveludado de batata doce com recheio de frango desfiado temperado com ervas finas.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151102_DY8N_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Fit', 'Low Carb'],
    stock: 10,
    available: true
  },
  {
    id: '3',
    externalProductId: '3',
    title: 'Escondidinho de Carne Moída',
    description: 'Clássico escondidinho com purê de batata inglesa e carne moída premium selecionada.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static-images.ifood.com.br/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202406111535_CQYS_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Carne'],
    stock: 12,
    available: true
  },
  {
    id: '4',
    externalProductId: '4',
    title: 'Espaguete a Bolonhesa',
    description: 'Massa grano duro com molho artesanal de tomate e carne moída suculenta.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151118_Y3R3_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Massa'],
    stock: 10,
    available: true
  },
  {
    id: '5',
    externalProductId: '5',
    title: 'Kibe de Forno',
    description: 'Kibe assado suculento, temperado com hortelã fresca e especiarias.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151104_078B_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Assado', 'Proteico'],
    stock: 15,
    available: true
  },
  {
    id: '6',
    externalProductId: '6',
    title: 'Mexido à Mineira',
    description: 'Combinação saborosa de arroz, feijão, ovo mexido, couve e cubinhos de frango.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151117_74F1_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Completo'],
    stock: 8,
    available: true
  },
  {
    id: '7',
    externalProductId: '7',
    title: 'Rubacão Fit',
    description: 'Versão equilibrada com arroz integral, feijão fradinho, frango e queijo coalho.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151114_55U2_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Regional'],
    stock: 10,
    available: true
  },
  {
    id: '9',
    externalProductId: '9',
    title: 'Feijuca Fit',
    description: 'Feijoada leve com carnes magras, arroz branco e couve refogada.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151107_IPNX_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Tradicional'],
    stock: 7,
    available: true
  },
  {
    id: '11',
    externalProductId: '11',
    title: 'Galinhada Integral',
    description: 'Arroz integral com pedaços suculentos de frango ao molho de tomates frescos.',
    price: 0,
    serving: '350g',
    imageUrl: 'https://static-images.ifood.com.br/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151110_KHY5_i.jpg',
    category: 'Marmitas PratoFit',
    tags: ['Integral'],
    stock: 5,
    available: true
  }
];

export const APP_NAME = "PratoFit";
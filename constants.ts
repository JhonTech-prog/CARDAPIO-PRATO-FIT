
import { MenuItem, KitDefinition } from './types';

export interface DeliveryZone {
  price: number;
  label: string;
  neighborhoods: string[];
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    price: 7.00,
    label: 'Bairros Vizinhos (Zona Sul/Leste)',
    neighborhoods: [
      'Catolé',
      'Sandra Cavalcante',
      'Mirante',
      'Itararé',
      'Vila Cabral',
      'Jardim Paulistano',
      'Tambor',
      'Liberdade'
    ]
  },
  {
    price: 9.00,
    label: 'Bairros Intermediários (Centro/Norte)',
    neighborhoods: [
      'Centro',
      'Prata',
      'São José',
      'Alto Branco',
      'Jardim Tavares',
      'Lauritzen',
      'Santo Antônio',
      'Monte Santo',
      'Universitário',
      'Bela Vista'
    ]
  },
  {
    price: 12.00,
    label: 'Bairros Afastados (Zona Oeste/Extremos)',
    neighborhoods: [
      'Malvinas',
      'Bodocongó',
      'Cruzeiro',
      'Dinamérica',
      'Três Irmãs',
      'Serrotão',
      'Catingueira',
      'Velame',
      'Distrito Industrial',
      'Aluízio Campos'
    ]
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

// Using specific iFood images provided by the user
export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    title: 'Bobó de Frango',
    description: 'O Bobó de Frango é uma marmita congelada, prática e saudável, que pode ser levada diretamente ao microondas. Em apenas 5 minutos...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151100_03UX_i.jpg', 
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Frango', 'Sem Glúten']
  },
  {
    id: '2',
    title: 'Escondidinho Frango com Batata Doce',
    description: 'Nosso "Escondidinho de Batata Doce com Frango" é uma marmita congelada, prática e saudável, que pode ser facilmente...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151102_DY8N_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Fit', 'Low Carb']
  },
  {
    id: '3',
    title: 'Escondidinho de Carne Moída com Batata Inglesa',
    description: 'Apresentamos nosso Escondidinho de Carne Moída com Batata Inglesa, uma Marmita Saudável Congelada, ideal para quem...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static-images.ifood.com.br/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202406111535_CQYS_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Carne', 'Confort Food']
  },
  {
    id: '4',
    title: 'Espaguete a Bolonhesa',
    description: 'Este Espaguete à Bolonhesa, pertencente à nossa linha de Marmitas Saudáveis Congeladas, é uma opção conveniente e...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151118_Y3R3_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Massa', 'Clássico']
  },
  {
    id: '5',
    title: 'Kibe de Forno',
    description: 'Descubra o sabor inigualável do nosso "Kibe de Forno", uma opção irresistível da nossa categoria "Marmitas Saudáveis...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151104_078B_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Árabe', 'Proteico']
  },
  {
    id: '6',
    title: 'Mexido à Mineira',
    description: 'Desfrute do nosso "Mexido à Mineira", uma opção incrível em nossa seleção de Marmitas Saudáveis Congeladas. Esta marmi...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151117_74F1_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Brasileiro', 'Completo']
  },
  {
    id: '7',
    title: 'Rubacão Fit',
    description: 'O "Rubacão Fit" é uma marmita congelada da nossa categoria "Marmitas Saudáveis Congeladas". Com a praticidade de ir direto...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151114_55U2_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Nordestino', 'Cremoso']
  },
  {
    id: '8',
    title: 'Chilli de Feijão Carioca',
    description: 'Nosso "Chilli" é uma marmita saudável congelada, preparada com ingredientes de alta qualidade que você pode levar diretament...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151111_S157_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Apimentado', 'Feijão']
  },
  {
    id: '9',
    title: 'Feijuca Fit',
    description: 'A "Feijuca Fit" é uma deliciosa e saudável marmita congelada, pronta para ser aquecida no microondas em apenas 5 min...',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151107_IPNX_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Brasileiro', 'Light']
  },
  {
    id: '11',
    title: 'Galinhada Integral no molho Caseiro de Frango',
    description: 'Saboreie a deliciosa "Galinhada Integral no Molho Caseiro de Frango", uma Marmita Congelada pronta para ser levada ao forno micro-ondas para um eficiente descongelamento e aquecimento em apenas 5 a 8 minutos. Este prato é preparado com ingredientes frescos: suculentos pedaços de frango, azeite extra virgem, cebola, alho, tomate, pimentão e arroz integral enriquecido com cenoura, ervilha e couve.',
    price: 0,
    originalPrice: 0,
    serving: 'Serve 1 pessoa (350g)',
    imageUrl: 'https://static-images.ifood.com.br/pratos/dabc25a4-58f9-43a9-a660-9c8f5125abfd/202402151110_KHY5_i.jpg',
    category: 'Marmitas Saudáveis Congeladas (Almoço)',
    tags: ['Integral', 'Frango', 'Caseiro']
  }
];

export const APP_NAME = "PratoFit";

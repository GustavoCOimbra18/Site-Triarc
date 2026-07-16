import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "triarc-comp-01",
    name: "Camiseta Masculina Pro Tech - Muscle Gym Edition",
    description: "Modelagem premium de alta compressão projetada com fibra ultra-flexível de polímero regulador de suor. Reduz a fadiga muscular e se adapta perfeitamente ao corpo durante treinos intensos. Apresenta o icônico triângulo dourado texturizado TRIARC centralizado e acabamento refinado de costura dupla.",
    price: 189,
    currency: "BRL",
    imageUrl: "/images/model_male_workout.jpg",
    images: [
      "/images/model_male_athletic.jpg",
      "/images/model_male_dumbbells.jpg"
    ],
    category: "Compressão",
    stock: 17,
    sizes: ["P", "M", "G"],
    sizeStock: { "P": 2, "M": 10, "G": 5 },
    colors: ["Carbon Black", "Golden Shield", "Titan Gray"],
    salesCount: 142,
    material: "85% Poliamida Tecnológica, 15% Elastano de Alta Densidade",
    tags: ["Secagem Rápida", "Compressão Térmica", "Tecnologia Dry regulator"],
    createdAt: new Date("2026-05-20").toISOString(),
    updatedAt: new Date("2026-05-20").toISOString()
  },
  {
    id: "triarc-comp-02",
    name: "Camiseta Masculina Carbon Elite - Classic Fit",
    description: "Confeccionada em algodão egípcio penteado e elastano premium com acabamento térmico inteligente. Caimento clássico perfeito que valoriza o peitoral e braços mantendo liberdade de movimentos. Uma peça sutil e extremamente elegante com a logo TRIARC dourada no peito.",
    price: 149,
    currency: "BRL",
    imageUrl: "/images/model_male_athletic.jpg",
    images: [
      "/images/model_male_dumbbells.jpg",
      "/images/model_male_workout.jpg"
    ],
    category: "Camisetas",
    stock: 17,
    sizes: ["P", "M", "G"],
    sizeStock: { "P": 2, "M": 10, "G": 5 },
    colors: ["Stealth Black", "Obsidian Gray", "Off-White Elite"],
    salesCount: 189,
    material: "90% Algodão Premium Penteado, 10% Spandex Four-Way Stretch",
    tags: ["Ajuste Classic", "Toque Inteligente Ultra-confortável", "Triângulo Gold"],
    createdAt: new Date("2026-05-22").toISOString(),
    updatedAt: new Date("2026-05-22").toISOString()
  },
  {
    id: "triarc-comp-03",
    name: "Camiseta Masculina Carbon Active - Dumbbell Heavy",
    description: "Engenharia de precisão para atletas de musculação e crossfit de alto nível. Tecido ultra-leve com micro canais de ventilação, modelagem raglan que acompanha a flexão dos ombros e logo centralizada dourada. Sinta o caimento e a respirabilidade insuperáveis.",
    price: 169,
    currency: "BRL",
    imageUrl: "/images/model_male_dumbbells.jpg",
    images: [
      "/images/model_male_athletic.jpg"
    ],
    category: "Camisetas",
    stock: 17,
    sizes: ["P", "M", "G"],
    sizeStock: { "P": 2, "M": 10, "G": 5 },
    colors: ["Titanium Black/Gold", "Pure Obsidian/White"],
    salesCount: 215,
    material: "Poliéster Reciclado Oceânico Premium e Elastano Inteligente",
    tags: ["Performance Raglan", "Respirável", "Treino de Alto Impacto"],
    createdAt: new Date("2026-05-24").toISOString(),
    updatedAt: new Date("2026-05-24").toISOString()
  },
  {
    id: "triarc-bra-04",
    name: "Camiseta Feminina Hydra-Active - Blonde Fit",
    description: "Especificamente desenhada para valorizar e se ajustar à silhueta atlética feminina sem limitar movimentos transversais. Tecnologia de toque sedoso frio que agiliza a evaporação do suor e mantém a peça leve. Detalhe refinado com a logo lendária dourada TRIARC no centro.",
    price: 159,
    currency: "BRL",
    imageUrl: "/images/model_female_blonde.jpg",
    images: [
      "/images/model_female_dumbbells.jpg"
    ],
    category: "Feminino",
    stock: 17,
    sizes: ["P", "M", "G"],
    sizeStock: { "P": 2, "M": 10, "G": 5 },
    colors: ["Cyber Gold", "Stealth Black"],
    salesCount: 110,
    material: "Suplex Premium Termo-Regulador de Alta Compressão",
    tags: ["Silhueta Slim", "Logo Dourada Premium", "Estilo de Vida Feminino"],
    createdAt: new Date("2026-05-25").toISOString(),
    updatedAt: new Date("2026-05-25").toISOString()
  },
  {
    id: "triarc-wind-05",
    name: "Camiseta Feminina Carbon Active - Silhouette Fit",
    description: "Design minimalista contemporâneo e toque suave com alto gerenciamento térmico para treinos pesados. Excelente caimento atlético que acompanha todas as curvas oferecendo estabilidade térmica, costuras anatômicas planas para zero atrito com a pele durante corrida ou crossfit.",
    price: 159,
    currency: "BRL",
    imageUrl: "/images/model_female_dumbbells.jpg",
    images: [
      "/images/model_female_blonde.jpg"
    ],
    category: "Feminino",
    stock: 17,
    sizes: ["P", "M", "G"],
    sizeStock: { "P": 2, "M": 10, "G": 5 },
    colors: ["Stealth Black", "Titanium Gray"],
    salesCount: 65,
    material: "Poliéster Premium de Secagem Ultra-Rápida e Elastano DuPont",
    tags: ["Conforto Flatlock", "Proteção UV50+", "Silhueta Esportiva"],
    createdAt: new Date("2026-05-26").toISOString(),
    updatedAt: new Date("2026-05-26").toISOString()
  }
];

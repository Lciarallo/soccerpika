export type Era = '80s' | '90s' | '2000s' | '2010s+' | 'Sem data';

export type Category =
  | 'Brasileiros'
  | 'Europeus'
  | 'Seleções'
  | 'Sulamericanas'
  | 'De Jogo'
  | 'Outros';

export interface Jersey {
  /** UUID vindo do banco — é o que o checkout envia ao servidor. */
  id: string;
  slug?: string;
  name: string;
  club: string;
  season: string;
  era: Era | string;
  category: Category | string;
  /** Segundo nível do menu da loja: Autografadas, Espanhóis, Italianos. */
  subcategory?: string;
  /** Presente só no catálogo estático gerado pelo scraper. */
  categories?: string[];
  price: number;
  brand: string;
  description: string;
  images: string[];
  sizes: string[];
  colors?: string[];
  inStock: boolean;
  stockQty: number;
  isMatchWorn: boolean;
  isAutographed: boolean;
  isPublished?: boolean;
  weightGrams?: number;
  isFreeShipping?: boolean;
  sourceUrl?: string | null;
  createdAt?: string;
}

export interface CartItem {
  jersey: Jersey;
  size: string;
  quantity: number;
}

export type SortBy =
  | 'preco-asc'
  | 'preco-desc'
  | 'nome'
  | 'nome-desc'
  | 'novo'
  | 'antigo'
  | 'destaque'
  | 'featured';

export interface FilterState {
  query: string;
  category: string;
  era: string;
  brands: string[];
  colors: string[];
  sizes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sortBy: SortBy;
}

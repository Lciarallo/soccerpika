export type Era = '80s' | '90s' | '2000s' | '2010s+' | 'Sem data';

export type Category =
  | 'Brasileiros'
  | 'Europeus'
  | 'Seleções'
  | 'Sulamericanas'
  | 'De Jogo'
  | 'Outros';

export interface Jersey {
  id: string;
  name: string;
  club: string;
  season: string;
  era: Era;
  category: Category;
  categories: string[];
  price: number;
  brand: string;
  description: string;
  images: string[];
  sizes: string[];
  colors: string[];
  inStock: boolean;
  stockQty: number;
  isMatchWorn: boolean;
  isAutographed: boolean;
  sourceUrl: string;
}

export interface CartItem {
  jersey: Jersey;
  size: string;
  quantity: number;
}

export type SortBy = 'destaque' | 'preco-asc' | 'preco-desc' | 'nome';

export interface FilterState {
  query: string;
  category: string;
  era: string;
  brand: string;
  onlyInStock: boolean;
  sortBy: SortBy;
}

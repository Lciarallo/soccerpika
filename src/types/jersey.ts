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
  /** Só o admin vê produtos despublicados. */
  isPublished?: boolean;
  sourceUrl?: string | null;
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

export type RarityTier = 'GRAIL' | 'LEGENDARY' | 'COLLECTOR' | 'RARE';

export type Condition = '10/10 (Nova c/ Etiquetas)' | '9.5/10 (Impecável de Época)' | '9/10 (Excelente Estado)' | '8.5/10 (Match Worn com Marcas de Jogo)';

export type EraCategory = '80s' | '90s' | '2000s' | '2010s';

export type TeamType = 'Seleção' | 'Clube Europeu' | 'Clube Sul-Americano';

export interface Jersey {
  id: string;
  name: string;
  club: string;
  season: string;
  era: EraCategory;
  teamType: TeamType;
  rarityTier: RarityTier;
  condition: Condition;
  price: number;
  originalPrice?: number;
  brand: string;
  playerNumber?: string;
  playerName?: string;
  description: string;
  history: string;
  authenticityCode: string;
  isMatchWorn?: boolean;
  isAutographed?: boolean;
  featured?: boolean;
  images: string[];
  sizes: ('P' | 'M' | 'G' | 'GG')[];
  inStock: boolean;
}

export interface CartItem {
  jersey: Jersey;
  size: 'P' | 'M' | 'G' | 'GG';
  quantity: number;
}

export interface FilterState {
  searchQuery: string;
  era: string;
  teamType: string;
  rarityTier: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rarity';
}

export interface VerificationResult {
  valid: boolean;
  jersey?: Jersey;
  issuedDate?: string;
  certificateId?: string;
}

import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Trophy, RefreshCw, Layers } from 'lucide-react';
import type { Jersey } from '../types/jersey';
import { JerseyCard } from './JerseyCard';

interface CatalogProps {
  jerseys: Jersey[];
  wishlistIds: string[];
  onToggleWishlist: (jersey: Jersey) => void;
  onSelectJersey: (jersey: Jersey) => void;
  onAddToCart: (jersey: Jersey, size: 'P' | 'M' | 'G' | 'GG') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Catalog: React.FC<CatalogProps> = ({
  jerseys,
  wishlistIds,
  onToggleWishlist,
  onSelectJersey,
  onAddToCart,
  searchQuery,
  setSearchQuery
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [selectedEra, setSelectedEra] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rarity'>('featured');

  const filteredJerseys = useMemo(() => {
    return jerseys.filter(jersey => {
      // Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchName = jersey.name.toLowerCase().includes(query);
        const matchClub = jersey.club.toLowerCase().includes(query);
        const matchPlayer = jersey.playerName?.toLowerCase().includes(query);
        const matchBrand = jersey.brand.toLowerCase().includes(query);
        const matchCode = jersey.authenticityCode.toLowerCase().includes(query);
        if (!matchName && !matchClub && !matchPlayer && !matchBrand && !matchCode) return false;
      }

      // Category Tabs
      if (selectedCategoryTab === 'MATCH_WORN' && !jersey.isMatchWorn) return false;
      if (selectedCategoryTab === 'AUTOGRAPHED' && !jersey.isAutographed) return false;
      if (selectedCategoryTab === 'SELECAO' && jersey.teamType !== 'Seleção') return false;
      if (selectedCategoryTab === 'EUROPEU' && jersey.teamType !== 'Clube Europeu') return false;
      if (selectedCategoryTab === 'SUL_AMERICANO' && jersey.teamType !== 'Clube Sul-Americano') return false;

      // Era
      if (selectedEra !== 'ALL' && jersey.era !== selectedEra) return false;

      // Rarity
      if (selectedRarity !== 'ALL' && jersey.rarityTier !== selectedRarity) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rarity') {
        const rarityMap = { GRAIL: 4, LEGENDARY: 3, COLLECTOR: 2, RARE: 1 };
        return rarityMap[b.rarityTier] - rarityMap[a.rarityTier];
      }
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [jerseys, searchQuery, selectedCategoryTab, selectedEra, selectedRarity, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryTab('ALL');
    setSelectedEra('ALL');
    setSelectedRarity('ALL');
    setSortBy('featured');
  };

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-[#00FF7F] text-xs font-black tracking-widest uppercase mb-1">
            <Layers className="w-4 h-4" />
            ACERVO COMPLETO SOCCER PIKA
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
            Garagem de Mantos Raros
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Exibindo <span className="text-[#00FF7F] font-bold font-mono">{filteredJerseys.length}</span> de <span className="text-white font-bold font-mono">{jerseys.length}</span> camisas autênticas em estoque.
          </p>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 bg-[#0f1523] p-2 rounded-xl border border-white/10">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 ml-1" />
          <span className="text-xs text-gray-400 font-bold hidden sm:inline">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-transparent text-white text-xs font-bold py-1 pr-3 focus:outline-none cursor-pointer"
          >
            <option value="featured" className="bg-[#0f1523]">Destaques Pika</option>
            <option value="rarity" className="bg-[#0f1523]">Nível de Raridade (Maior)</option>
            <option value="price-asc" className="bg-[#0f1523]">Menor Preço</option>
            <option value="price-desc" className="bg-[#0f1523]">Maior Preço</option>
          </select>
        </div>
      </div>

      {/* Main Category Filter Tabs */}
      <div className="space-y-4 mb-8">
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'ALL', label: '⚡ Todas as Camisas', count: jerseys.length },
            { id: 'MATCH_WORN', label: '👕 De Jogo (Match Worn)', count: jerseys.filter(j => j.isMatchWorn).length },
            { id: 'AUTOGRAPHED', label: '✍️ Autografadas', count: jerseys.filter(j => j.isAutographed).length },
            { id: 'SUL_AMERICANO', label: '🏆 Sul-Americanos', count: jerseys.filter(j => j.teamType === 'Clube Sul-Americano').length },
            { id: 'EUROPEU', label: '🇪🇺 Clubes Europeus', count: jerseys.filter(j => j.teamType === 'Clube Europeu').length },
            { id: 'SELECAO', label: '🇧🇷 Seleções Nacionais', count: jerseys.filter(j => j.teamType === 'Seleção').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategoryTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedCategoryTab === tab.id
                  ? 'bg-[#00FF7F]/15 border-[#00FF7F] text-[#00FF7F] shadow-[0_0_20px_rgba(0,255,127,0.2)]'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedCategoryTab === tab.id ? 'bg-[#00FF7F] text-[#041209]' : 'bg-white/10 text-gray-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sub-Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">Época:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'ALL', label: 'Todas' },
                { id: '80s', label: 'Anos 80' },
                { id: '90s', label: 'Anos 90' },
                { id: '2000s', label: 'Anos 2000' },
                { id: '2010s', label: 'Anos 2010+' }
              ].map(era => (
                <button
                  key={era.id}
                  onClick={() => setSelectedEra(era.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                    selectedEra === era.id 
                      ? 'bg-white text-black border-white' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">Nível:</span>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="bg-[#0f1523] text-white font-bold py-1 px-3 rounded-lg border border-white/10 focus:outline-none"
            >
              <option value="ALL">Todas as Raridades</option>
              <option value="GRAIL">★ GRAIL (Match Worn / Relíquias)</option>
              <option value="LEGENDARY">Legendárias</option>
              <option value="COLLECTOR">Colecionador</option>
            </select>
          </div>

          {(selectedEra !== 'ALL' || selectedCategoryTab !== 'ALL' || selectedRarity !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={resetFilters}
              className="text-[#FF3366] hover:underline font-bold flex items-center gap-1 ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}

        </div>

      </div>

      {/* Catalog Grid */}
      {filteredJerseys.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJerseys.map(jersey => (
            <JerseyCard
              key={jersey.id}
              jersey={jersey}
              isWishlisted={wishlistIds.includes(jersey.id)}
              onToggleWishlist={onToggleWishlist}
              onSelectJersey={onSelectJersey}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center glass-panel p-8 max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center text-gray-500">
            <Trophy className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Nenhum manto encontrado</h3>
          <p className="text-sm text-gray-400">
            Não encontramos camisas para os filtros selecionados.
          </p>
          <button onClick={resetFilters} className="btn-primary text-xs mx-auto">
            Redefinir Filtros
          </button>
        </div>
      )}

    </section>
  );
};

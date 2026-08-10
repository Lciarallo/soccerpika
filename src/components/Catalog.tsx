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
  const [selectedEra, setSelectedEra] = useState<string>('ALL');
  const [selectedTeamType, setSelectedTeamType] = useState<string>('ALL');
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

      // Era
      if (selectedEra !== 'ALL' && jersey.era !== selectedEra) return false;

      // Team Type
      if (selectedTeamType !== 'ALL' && jersey.teamType !== selectedTeamType) return false;

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
  }, [jerseys, searchQuery, selectedEra, selectedTeamType, selectedRarity, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedEra('ALL');
    setSelectedTeamType('ALL');
    setSelectedRarity('ALL');
    setSortBy('featured');
  };

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-[#00FF7F] text-xs font-bold tracking-widest uppercase mb-1">
            <Layers className="w-4 h-4" />
            ACERVO HISTÓRICO DE MANTO
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Outfit']">
            Catálogo de Raridades SoccerPika
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Exibindo <span className="text-[#00FF7F] font-bold">{filteredJerseys.length}</span> mantos raros com certificado de autenticidade original.
          </p>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 bg-[#0e131f] p-1.5 rounded-xl border border-white/10">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 ml-2" />
          <span className="text-xs text-gray-400 font-semibold hidden sm:inline">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-transparent text-white text-xs font-bold py-1.5 pr-3 focus:outline-none cursor-pointer"
          >
            <option value="featured" className="bg-[#0e131f]">Destaques Vault</option>
            <option value="rarity" className="bg-[#0e131f]">Nível de Raridade (Maior)</option>
            <option value="price-asc" className="bg-[#0e131f]">Menor Preço</option>
            <option value="price-desc" className="bg-[#0e131f]">Maior Preço</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs & Bar */}
      <div className="space-y-4 mb-10">
        
        {/* Era Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mr-2 whitespace-nowrap">Época:</span>
          {[
            { id: 'ALL', label: 'Todas as Décadas' },
            { id: '80s', label: 'Anos 80 (Retro)' },
            { id: '90s', label: 'Anos 90 (Vintage)' },
            { id: '2000s', label: 'Anos 2000 (Classics)' },
            { id: '2010s', label: 'Anos 2010 (Moderns)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedEra(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedEra === tab.id
                  ? 'bg-[#00FF7F]/15 border-[#00FF7F] text-[#00FF7F] shadow-[0_0_15px_rgba(0,255,127,0.15)]'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-Filters (Team Type & Rarity) */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10 text-xs">
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Tipo:</span>
            <select
              value={selectedTeamType}
              onChange={(e) => setSelectedTeamType(e.target.value)}
              className="bg-[#0e131f] text-white font-bold py-1.5 px-3 rounded-lg border border-white/10 focus:outline-none"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="Seleção">Seleções Nacionais</option>
              <option value="Clube Europeu">Clubes Europeus</option>
              <option value="Clube Sul-Americano">Clubes Sul-Americanos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Raridade:</span>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="bg-[#0e131f] text-white font-bold py-1.5 px-3 rounded-lg border border-white/10 focus:outline-none"
            >
              <option value="ALL">Todas as Raridades</option>
              <option value="GRAIL">★ GRAIL (Raríssimas)</option>
              <option value="LEGENDARY">Legendárias</option>
              <option value="COLLECTOR">Colecionador</option>
            </select>
          </div>

          {(selectedEra !== 'ALL' || selectedTeamType !== 'ALL' || selectedRarity !== 'ALL' || searchQuery !== '') && (
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
            Não encontramos resultados para a sua busca atual com os filtros selecionados.
          </p>
          <button onClick={resetFilters} className="btn-primary text-xs mx-auto">
            Redefinir Filtros
          </button>
        </div>
      )}

    </section>
  );
};

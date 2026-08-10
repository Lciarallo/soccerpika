import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Trophy, ArrowRight, Award, Flame, CheckCircle2 } from 'lucide-react';
import type { Jersey } from '../types/jersey';

interface HeroProps {
  featuredJersey: Jersey;
  onSelectJersey: (jersey: Jersey) => void;
  onOpenAuthenticity: () => void;
}

export const Hero: React.FC<HeroProps> = ({ featuredJersey, onSelectJersey, onOpenAuthenticity }) => {
  // Countdown Timer Simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero-spotlight" className="relative py-12 md:py-16 overflow-hidden border-b border-white/10">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#00FF7F]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Text & Hero Offer */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(255,215,0,0.15)]">
              <Flame className="w-4 h-4 text-[#FFD700] animate-bounce" />
              RELÍQUIA DA SEMANA • OPORTUNIDADE ÚNICA
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-['Outfit'] leading-[1.1]">
              <span className="block">{featuredJersey.name}</span>
              <span className="text-[#00FF7F] text-3xl sm:text-4xl block mt-2 font-extrabold">
                {featuredJersey.playerName ? `Manto de ${featuredJersey.playerName} • Temporada ${featuredJersey.season}` : `Temporada ${featuredJersey.season}`}
              </span>
            </h1>

            <p className="text-gray-300 text-base sm:text-lg max-w-2xl font-normal leading-relaxed">
              {featuredJersey.history}
            </p>

            {/* Badges & Provenance Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#00FF7F]" />
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Autenticidade</span>
                  <span className="text-xs font-bold text-white">Selo Vault {featuredJersey.authenticityCode}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-[#FFD700]" />
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Conservação</span>
                  <span className="text-xs font-bold text-[#FFD700]">{featuredJersey.condition}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 col-span-2 sm:col-span-1">
                <Award className="w-6 h-6 text-[#00E5FF]" />
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Categoria</span>
                  <span className="text-xs font-bold text-[#00E5FF]">Edição de Colecionador</span>
                </div>
              </div>
            </div>

            {/* Price & Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-[#00FF7F] font-['Outfit']">
                    R$ {featuredJersey.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {featuredJersey.originalPrice && (
                    <span className="text-lg text-gray-500 line-through font-semibold">
                      R$ {featuredJersey.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 block mt-1">Em até 10x sem juros ou 5% OFF no PIX</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onSelectJersey(featuredJersey)}
                  className="btn-primary text-base px-6 py-3.5"
                >
                  Garantir Este Manto
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>

                <button
                  onClick={onOpenAuthenticity}
                  className="btn-secondary text-sm px-4 py-3"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00FF7F]" />
                  Ver Certificado
                </button>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-xl bg-[#131a2a]/80 border border-[#00FF7F]/20 flex items-center justify-between gap-4 max-w-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
                <span className="text-xs font-bold text-gray-300">Tempo restante nesta oportunidade:</span>
              </div>
              <div className="flex items-center gap-2 font-mono font-black text-sm text-[#00FF7F]">
                <span className="bg-black/50 px-2 py-1 rounded border border-white/10">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-black/50 px-2 py-1 rounded border border-white/10">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-black/50 px-2 py-1 rounded border border-white/10">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Featured Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            <div className="relative w-full max-w-md aspect-[4/5] rounded-2xl overflow-hidden glass-panel border border-[#00FF7F]/30 shadow-[0_0_40px_rgba(0,255,127,0.15)] group cursor-pointer"
                 onClick={() => onSelectJersey(featuredJersey)}>
              
              {/* Product Image */}
              <img 
                src={featuredJersey.images[0]} 
                alt={featuredJersey.name}
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/30 to-transparent" />

              {/* Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="badge-rarity badge-grail font-black tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> GRAIL DE ÉPOCA
                </span>
                <span className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                  {featuredJersey.brand} • {featuredJersey.season}
                </span>
              </div>

              {/* Bottom Card Specs Overlay */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
                  <span>Autenticidade Verificada</span>
                  <span className="text-[#00FF7F] flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Original
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {featuredJersey.name}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                  <span className="text-gray-400">Tamanhos disponíveis:</span>
                  <span className="text-[#FFD700] font-mono font-bold">{featuredJersey.sizes.join(', ')}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

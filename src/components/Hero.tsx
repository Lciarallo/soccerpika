import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Trophy, ArrowRight, Award, Flame, CheckCircle2 } from 'lucide-react';
import type { Jersey } from '../types/jersey';

interface HeroProps {
  featuredJersey: Jersey;
  onSelectJersey: (jersey: Jersey) => void;
  onOpenAuthenticity: () => void;
}

export const Hero: React.FC<HeroProps> = ({ featuredJersey, onSelectJersey, onOpenAuthenticity }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 18, minutes: 42, seconds: 15 });

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
    <section id="hero-spotlight" className="relative py-12 md:py-16 overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#090d16] via-[#0d1320] to-[#090d16]">
      
      {/* Background pitch line accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00FF7F]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Text & Hero Offer */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/40 text-[#FFD700] text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(255,215,0,0.15)]">
              <Flame className="w-4 h-4 text-[#FFD700] animate-bounce" />
              RELÍQUIA MÁXIMA DO ACERVO • DE JOGO ORIGINAL
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-['Outfit'] leading-[1.08]">
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Procedência</span>
                  <span className="text-xs font-bold text-white">Selo {featuredJersey.authenticityCode}</span>
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Edição</span>
                  <span className="text-xs font-bold text-[#00E5FF]">Raridade Absoluta</span>
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
                  Ver Certificado Digital
                </button>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-xl bg-[#0f1624]/90 border border-[#00FF7F]/30 flex items-center justify-between gap-4 max-w-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
                <span className="text-xs font-bold text-gray-300">Reserva exclusiva no Vault:</span>
              </div>
              <div className="flex items-center gap-2 font-mono font-black text-sm text-[#00FF7F]">
                <span className="bg-black/60 px-2.5 py-1 rounded border border-white/10">{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span className="bg-black/60 px-2.5 py-1 rounded border border-white/10">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span>:</span>
                <span className="bg-black/60 px-2.5 py-1 rounded border border-white/10">{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Featured Jersey Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            <div className="relative w-full max-w-md aspect-[4/5] rounded-2xl overflow-hidden glass-panel border border-[#00FF7F]/40 shadow-[0_0_50px_rgba(0,255,127,0.2)] group cursor-pointer"
                 onClick={() => onSelectJersey(featuredJersey)}>
              
              <img 
                src={featuredJersey.images[0]} 
                alt={featuredJersey.name}
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/20 to-transparent" />

              {/* Top Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="badge-rarity badge-grail font-black tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> ★ SOCCER PIKA GRAIL
                </span>
                <span className="bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                  {featuredJersey.brand} • {featuredJersey.season}
                </span>
              </div>

              {/* Bottom Card Specs Overlay */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
                  <span>Curadoria Soccer Pika</span>
                  <span className="text-[#00FF7F] flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Original
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate font-['Outfit']">
                  {featuredJersey.name}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                  <span className="text-gray-400">Preço à vista:</span>
                  <span className="text-[#00FF7F] font-mono font-bold text-sm">R$ {featuredJersey.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

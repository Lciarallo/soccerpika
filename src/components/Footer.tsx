import React, { useState } from 'react';
import { Zap, ShieldCheck, Truck, Lock, ArrowRight, Heart, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="bg-[#05070a] border-t border-white/10 pt-16 pb-8 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Trust Badges Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF7F]/10 flex items-center justify-center text-[#00FF7F]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Curadoria 100% Autêntica</h4>
              <p className="text-gray-400 text-[11px]">Etiquetas e numerações originais de época verificadas.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Envio Blindado com Seguro</h4>
              <p className="text-gray-400 text-[11px]">Caixa rígida personalizada e lacre inviolável.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Certificado Digital Vault</h4>
              <p className="text-gray-400 text-[11px]">QR Code com histórico e procedência rastreável.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00FF7F] to-[#FFD700] p-[2px]">
                <div className="w-full h-full bg-[#0e131f] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                </div>
              </div>
              <span className="font-black text-xl tracking-wider text-white font-['Outfit']">SOCCER<span className="text-[#00FF7F]">PIKA</span></span>
            </div>
            <p className="text-gray-400 leading-relaxed max-w-sm">
              O destino definitivo para colecionadores exigentes de camisas raras, clássicas, vintage e de jogo. Cada peça em nosso acervo possui história e alma.
            </p>
          </div>

          {/* Links Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-white text-sm font-['Outfit'] uppercase tracking-wider">Navegação Vault</h4>
            <ul className="space-y-2">
              <li><a href="#catalog" className="hover:text-[#00FF7F] transition-colors">Catálogo de Relíquias</a></li>
              <li><a href="#hero-spotlight" className="hover:text-[#FFD700] transition-colors">Relíquia da Semana</a></li>
              <li><a href="#" className="hover:text-[#00FF7F] transition-colors">Verificar Código de Autenticidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Vender / Desapegar de Camisas</a></li>
            </ul>
          </div>

          {/* Newsletter Drops Alert */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-bold text-white text-sm font-['Outfit'] uppercase tracking-wider">Alertas de Drops Raros</h4>
            <p className="text-gray-400">Inscreva-se para receber notificações exclusivas antes de cada drop de mantos raros.</p>
            
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Seu e-mail de colecionador..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border border-white/10 focus:border-[#00FF7F] rounded-xl px-3.5 py-2.5 text-xs text-white flex-1 focus:outline-none"
              />
              <button type="submit" className="btn-primary py-2.5 px-4 text-xs font-bold whitespace-nowrap">
                {subscribed ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
            {subscribed && <p className="text-[11px] text-[#00FF7F] font-bold">Você foi cadastrado na lista VIP de drops!</p>}
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-[11px]">
          <p>© {new Date().getFullYear()} SOCCERPIKA VAULT. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Desenvolvido com <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> para os apaixonados por futebol retro.
          </p>
        </div>

      </div>
    </footer>
  );
};

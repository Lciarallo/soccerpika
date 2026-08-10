import React, { useState } from 'react';
import { X, Send, Sparkles, CheckCircle2 } from 'lucide-react';

interface SellJerseyFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellJerseyForm: React.FC<SellJerseyFormProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    jerseyName: '',
    year: '',
    condition: '10/10 (Nova c/ etiquetas)',
    price: '',
    details: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="relative w-full max-w-xl glass-panel border border-[#FFD700]/40 p-6 sm:p-8 bg-[#0a0f1c] shadow-[0_0_50px_rgba(255,215,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" /> CURATORIA & AVALIAÇÃO SOCCERPIKA
              </div>
              <h2 className="text-2xl font-black text-white font-['Outfit']">Venda ou Desapegue do seu Manto Raro</h2>
              <p className="text-xs text-gray-400">
                Nossos especialistas analisam etiquetas, costuras e marcas d'água para fazer uma oferta de compra ou consignação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-300 block">Seu Nome Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gabriel Barbosa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-300 block">WhatsApp ou E-mail:</label>
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-300 block">Nome da Camisa / Time / Jogador:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brasil 1998 Ronaldo #9"
                  value={formData.jerseyName}
                  onChange={(e) => setFormData({ ...formData, jerseyName: e.target.value })}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-300 block">Ano / Época da Peça:</label>
                <input
                  type="text"
                  placeholder="Ex: 1998"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-300 block">Detalhes Adicionais & Fotos (Link do Drive/Imgur):</label>
              <textarea
                rows={3}
                placeholder="Descreva defeitos, detalhes da etiqueta, se é match worn ou autografada..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="w-full bg-white/5 border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="btn-gold w-full py-3.5 text-center justify-center font-bold text-sm"
            >
              <Send className="w-4 h-4" /> Enviar Proposta para Avaliação
            </button>

          </form>
        ) : (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#FFD700] mx-auto animate-bounce" />
            <h3 className="text-2xl font-black text-white font-['Outfit']">Proposta Recebida com Sucesso!</h3>
            <p className="text-xs text-gray-300 max-w-md mx-auto">
              Nossa equipe de curadoria entrará em contato via WhatsApp/E-mail dentro de 24 horas úteis com a estimativa de avaliação.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="btn-secondary text-xs mx-auto px-6 py-2.5"
            >
              Fechar Janela
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

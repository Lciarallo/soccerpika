import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, X, Copy, Check, Sparkles } from 'lucide-react';
import type { Jersey } from '../types/jersey';

interface AuthenticityCheckerProps {
  jerseys: Jersey[];
  initialCode?: string;
  onClose: () => void;
}

export const AuthenticityChecker: React.FC<AuthenticityCheckerProps> = ({ jerseys, initialCode = '', onClose }) => {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<{ searched: boolean; jersey: Jersey | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleVerify = (codeToTest?: string) => {
    const testCode = (codeToTest || code).trim().toUpperCase();
    if (!testCode) return;

    const matched = jerseys.find(j => j.authenticityCode.toUpperCase() === testCode);
    setResult({
      searched: true,
      jersey: matched || null
    });
  };

  useEffect(() => {
    if (initialCode) {
      handleVerify(initialCode);
    }
  }, [initialCode]);

  const copyCertificate = () => {
    if (!result?.jersey) return;
    const text = `SOCCERPIKA VAULT™ CERTIFICADO DIGITAL DE AUTENTICIDADE\nCódigo: ${result.jersey.authenticityCode}\nItem: ${result.jersey.name}\nCondição: ${result.jersey.condition}\nStatus: 100% AUTÊNTICO & VERIFICADO`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl glass-panel border border-[#00FF7F]/40 p-6 sm:p-8 bg-[#090d16] shadow-[0_0_50px_rgba(0,255,127,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#00FF7F]/10 border border-[#00FF7F]/40 flex items-center justify-center mx-auto text-[#00FF7F]">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            SoccerPika Vault™ Verifier
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
            Consulte a procedência, etiqueta serial e selo de garantia de qualquer manto do nosso catálogo de relíquias.
          </p>
        </div>

        {/* Input Form */}
        <div className="space-y-4 mb-8">
          <label className="text-xs font-bold text-gray-300 block uppercase tracking-wider">
            Digite o Código de Autenticidade da Etiqueta:
          </label>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Ex: SPK-1998-BR9"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="flex-1 bg-white/5 border border-white/15 focus:border-[#00FF7F] rounded-xl px-4 py-3 text-white font-mono text-sm font-bold uppercase placeholder-gray-500 focus:outline-none"
            />
            <button
              onClick={() => handleVerify()}
              className="btn-primary py-3 px-6 text-sm"
            >
              Verificar Selo
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            <span>Códigos de demonstração:</span>
            {['SPK-1998-BR9', 'SPK-2007-ACM22', 'SPK-1981-BOC10'].map(c => (
              <button
                key={c}
                onClick={() => {
                  setCode(c);
                  handleVerify(c);
                }}
                className="bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded font-mono text-[#00FF7F] border border-white/10"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Result Card */}
        {result?.searched && (
          result.jersey ? (
            <div className="p-6 rounded-2xl bg-[#0d1424] border border-[#00FF7F]/50 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF7F]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-[#00FF7F]" />
                  <div>
                    <span className="text-[10px] font-black text-[#00FF7F] tracking-widest uppercase block">STATUS: VERIFICADO & AUTÊNTICO</span>
                    <h3 className="text-lg font-bold text-white font-['Outfit']">{result.jersey.name}</h3>
                  </div>
                </div>

                <button
                  onClick={copyCertificate}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center gap-1 border border-white/10"
                  title="Copiar certificado"
                >
                  {copied ? <Check className="w-4 h-4 text-[#00FF7F]" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">CÓDIGO SERIAL</span>
                  <span className="text-white font-mono font-bold">{result.jersey.authenticityCode}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">CONSERVAÇÃO</span>
                  <span className="text-[#FFD700] font-bold">{result.jersey.condition}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-gray-400 block text-[10px]">MARCA / ÉPOCA</span>
                  <span className="text-white font-bold">{result.jersey.brand} ({result.jersey.season})</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1 text-[#00FF7F]">
                  <Sparkles className="w-3.5 h-3.5" /> Curadoria SoccerPika Vault™ 100% Garantida
                </span>
                <span className="font-mono text-[10px] text-gray-500">ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Código Não Encontrado</h3>
              <p className="text-xs text-gray-300">
                O código informado não corresponde a nenhuma etiqueta cadastrada em nosso banco de relíquias ativas.
              </p>
            </div>
          )
        )}

      </div>
    </div>
  );
};

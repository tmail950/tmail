"use client";

import { useState, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cardUtils, type GeneratedCard } from "@/lib/cardUtils";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Terminal, Copy, PlusCircle, Check, Trash2, Zap, Shield, Sparkles } from "lucide-react";

export default function CardsPage() {
  const [bin, setBin] = useState("");
  const [amount, setAmount] = useState(10);
  const [results, setResults] = useState<GeneratedCard[]>([]);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    // Add small delay for animation feel
    setTimeout(() => {
      const newCards = Array.from({ length: amount }, () => cardUtils.generateRandomCard(bin));
      setResults(prev => [...newCards, ...prev].slice(0, 100)); // Keep last 100
      setIsGenerating(false);
    }, 400);
  }, [bin, amount]);

  const copyResults = useCallback(() => {
    const text = results.map(c => `${c.number}|${c.expiryMonth}|${c.expiryYear}|${c.cvv}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [results]);

  const clearResults = () => setResults([]);

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[var(--color-brand-pink)] selection:text-white">
      <Header />
      
      <div className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]">
              Virtual <span className="text-[var(--color-brand-pink)] drop-shadow-[0_0_20px_rgba(255,18,177,0.4)]">Card</span> <br/>
              Matrix Platform
            </h1>
            <p className="max-w-xl mx-auto text-gray-500 text-xs sm:text-sm font-medium leading-relaxed tracking-wide">
              Generate valid-formatted test credentials for payment gateway testing and UI validation.
              Secure, distributed, and instantly processed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Control Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass-panel p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-brand-pink)]/50 to-transparent"></div>
                
                <h2 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.3em] text-white italic">
                  <Terminal className="w-4 h-4 text-[var(--color-brand-pink)]" />
                  Configuration
                </h2>

                <div className="space-y-6">
                  {/* BIN Input */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Card Prefix (BIN)</label>
                    <input 
                      type="text"
                      placeholder="e.g. 453xxx (x for random)"
                      value={bin}
                      onChange={(e) => setBin(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[var(--color-brand-pink)]/50 transition-all font-mono text-white text-lg placeholder:text-gray-800"
                    />
                  </div>

                  {/* Quantity Slider/Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Quantity: {amount}</label>
                    <input 
                      type="range"
                      min="1"
                      max="100"
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      className="w-full accent-[var(--color-brand-pink)] bg-white/10 rounded-full h-1.5 cursor-pointer appearance-none"
                    />
                  </div>

                  {/* Generate Button */}
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl relative overflow-hidden group"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Zap className="w-4 h-4 fill-black" />
                      )}
                      {isGenerating ? "Processing..." : "Generate Matrix"}
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Badge */}
              <div className="glass-panel p-6 rounded-[30px] border border-white/5 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Luhn Algorithm Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Randomized Entropy</span>
                </div>
              </div>
            </div>

            {/* Results Terminal */}
            <div className="lg:col-span-7 h-full">
              <div className="glass-panel h-full min-h-[500px] rounded-[40px] border border-white/5 flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/30"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/30"></div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Output Terminal</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {results.length > 0 && (
                      <>
                        <button 
                          onClick={clearResults}
                          className="p-2.5 rounded-xl hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={copyResults}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            copied ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy All"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 font-mono text-xs overflow-y-auto scrollbar-hide">
                  <AnimatePresence mode="popLayout">
                    {results.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20"
                      >
                        <CreditCard className="w-20 h-20 stroke-[0.5]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No matrix data generated</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {results.map((card, idx) => (
                          <motion.div 
                            key={`${card.number}-${idx}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (idx % 10) * 0.05 }}
                            className="group flex flex-wrap items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:border-[var(--color-brand-pink)]/30 hover:bg-white/[0.04] transition-all"
                          >
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black opacity-30 w-4">{idx + 1}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                  card.type === 'Visa' ? 'text-blue-400 bg-blue-400/10' : 
                                  card.type === 'MasterCard' ? 'text-orange-400 bg-orange-400/10' : 
                                  'text-cyan-400 bg-cyan-400/10'
                                }`}>
                                  {card.type}
                                </span>
                              </div>
                              <span className="text-sm font-medium tracking-wider text-gray-200">{card.number}</span>
                              <div className="flex items-center gap-4 text-gray-500 font-bold">
                                <span>{card.expiryMonth}/{card.expiryYear}</span>
                                <span>{card.cvv}</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => navigator.clipboard.writeText(`${card.number}|${card.expiryMonth}|${card.expiryYear}|${card.cvv}`)}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

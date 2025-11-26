import React, { useState } from 'react';

const CoinGrid = ({ coins }) => (
  <div className="grid grid-cols-2 gap-3 mt-3">
    {[
      { l: 'PO', v: coins.po, c: 'text-yellow-500', b: 'border-yellow-500/30 bg-yellow-500/5' },
      { l: 'PA', v: coins.pa, c: 'text-gray-300', b: 'border-gray-400/30 bg-gray-400/5' },
      { l: 'PC', v: coins.pc, c: 'text-orange-600', b: 'border-orange-700/30 bg-orange-700/5' },
      { l: 'PP', v: coins.pp, c: 'text-slate-200', b: 'border-slate-300/30 bg-slate-300/5' }
    ].map((coin) => (
      <div key={coin.l} className={`p-3 rounded-lg border ${coin.b} flex justify-between items-center`}>
        <span className={`font-bold ${coin.c}`}>{coin.v}</span>
        <span className={`text-xs font-bold opacity-50 ${coin.c}`}>{coin.l}</span>
      </div>
    ))}
  </div>
);

const Argent = ({ playerData, onRefresh, auth, sessionId }) => {
  const m = playerData.money;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferDir, setTransferDir] = useState('wallet_to_bank');
  const [selectedCoin, setSelectedCoin] = useState('pc');
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sourceName = transferDir === 'wallet_to_bank' ? 'wallet' : 'bank';
  const destName = transferDir === 'wallet_to_bank' ? 'bank' : 'wallet';
  const maxAmount = m[sourceName][selectedCoin] || 0;

  const handleAmountChange = (e) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) setAmount("");
    else if (val < 0) setAmount(0);
    else if (val > maxAmount) setAmount(maxAmount);
    else setAmount(val);
  };

  const handleTransfer = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          session_id: sessionId,
          from: sourceName,
          to: destName,
          coin: selectedCoin,
          amount: val
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        await onRefresh();
        setAmount("");
        setIsModalOpen(false);
      } else {
        alert("Erreur : " + data.error);
      }
    } catch (e) {
      alert("Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div>
        <h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2">👛 Porte-monnaie</h3>
        <CoinGrid coins={m.wallet} />
      </div>
      <div>
        <h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2">🏦 Banque</h3>
        <CoinGrid coins={m.bank} />
      </div>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <span>⇄</span> Faire un Transfert
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Transfert d'Argent</h2>
            
            <div className="flex items-center justify-between bg-[#111] p-1 rounded-lg mb-6 border border-gray-700">
              <button 
                onClick={() => { setTransferDir('wallet_to_bank'); setAmount(""); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transferDir === 'wallet_to_bank' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                👛 ➔ 🏦
              </button>
              <button 
                onClick={() => { setTransferDir('bank_to_wallet'); setAmount(""); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${transferDir === 'bank_to_wallet' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                🏦 ➔ 👛
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Type de pièce</label>
              <select 
                value={selectedCoin} 
                onChange={(e) => { setSelectedCoin(e.target.value); setAmount(""); }}
                className="w-full p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="pc">Pièce de Cuivre (PC)</option>
                <option value="pa">Pièce d'Argent (PA)</option>
                <option value="po">Pièce d'Or (PO)</option>
                <option value="pp">Pièce de Platine (PP)</option>
              </select>
            </div>

            <div className="mb-6">
              <div className="flex justify-between mb-1">
                <label className="text-xs text-gray-400 uppercase font-bold">Montant</label>
                <span className="text-xs text-indigo-400 font-mono">Dispo: {maxAmount}</span>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="flex-1 p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white font-mono text-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button 
                  onClick={() => setAmount(maxAmount)}
                  className="px-3 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg border border-gray-600"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              {/* BOUTON CONFIRMER */}
              <button 
                onClick={handleTransfer}
                disabled={!amount || amount <= 0 || isLoading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {isLoading ? '...' : 'Confirmer'}
              </button>
              
              {/* BOUTON ANNULER */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Argent;
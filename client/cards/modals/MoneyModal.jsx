import React, { useState } from 'react';

const MoneyModal = ({ isOpen, onClose, auth, sessionId, onRefresh, playerData }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('transfer');
  const [isLoading, setIsLoading] = useState(false);
  const m = playerData.money;

  // États Transfert
  const [transferDir, setTransferDir] = useState('wallet_to_bank');
  const [transferCoin, setTransferCoin] = useState('pc');
  const [transferAmount, setTransferAmount] = useState("");

  // États Base
  const [baseTarget, setBaseTarget] = useState('wallet');
  const [baseAction, setBaseAction] = useState('add');
  const [baseCoin, setBaseCoin] = useState('pc');
  const [baseAmount, setBaseAmount] = useState("");

  const coinOptions = [
    {v: 'pc', l: 'PC', c: 'text-orange-600'}, {v: 'pa', l: 'PA', c: 'text-gray-400'},
    {v: 'po', l: 'PO', c: 'text-yellow-500'}, {v: 'pp', l: 'PP', c: 'text-slate-300'}
  ];

  const handleTransfer = async () => {
    const val = parseInt(transferAmount);
    if (!val || val <= 0) return;
    const sourceName = transferDir === 'wallet_to_bank' ? 'wallet' : 'bank';
    const destName = transferDir === 'wallet_to_bank' ? 'bank' : 'wallet';
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/transfer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, from: sourceName, to: destName, coin: transferCoin, amount: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setTransferAmount(""); }
      else { alert("Erreur : " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleBaseMoney = async () => {
    const val = parseInt(baseAmount);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/money", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, target: baseTarget, action: baseAction, coin: baseCoin, value: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setBaseAmount(""); }
      else { alert("Erreur : " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const tabClass = (active) => `flex-1 py-3 text-sm font-bold uppercase transition-colors border-b-2 ${active ? 'border-yellow-500 text-yellow-400 bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        <div className="flex bg-[#151515] border-b border-gray-700">
          <button onClick={() => setActiveTab('transfer')} className={tabClass(activeTab === 'transfer')}>Transfert</button>
          <button onClick={() => setActiveTab('base')} className={tabClass(activeTab === 'base')}>Base</button>
        </div>

        <div className="p-6">
          {activeTab === 'transfer' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                <button onClick={() => setTransferDir('wallet_to_bank')} className={`flex-1 py-2 text-xs font-bold rounded ${transferDir === 'wallet_to_bank' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>👛 ➔ 🏦</button>
                <button onClick={() => setTransferDir('bank_to_wallet')} className={`flex-1 py-2 text-xs font-bold rounded ${transferDir === 'bank_to_wallet' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>🏦 ➔ 👛</button>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Pièce</label>
                <div className="flex gap-2">
                  {coinOptions.map(c => (
                    <button key={c.v} onClick={() => setTransferCoin(c.v)} className={`flex-1 py-1 rounded border text-xs font-bold ${transferCoin === c.v ? 'bg-white/10 border-white text-white' : 'border-gray-700 text-gray-500'}`}>{c.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1"><label className="text-xs text-gray-500 uppercase font-bold">Montant</label><span className="text-xs text-gray-500">Max: {m[transferDir === 'wallet_to_bank' ? 'wallet' : 'bank'][transferCoin]}</span></div>
                <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white font-mono" placeholder="0"/>
              </div>
              <button onClick={handleTransfer} disabled={isLoading || !transferAmount} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 mt-2">Transférer</button>
            </div>
          )}

          {activeTab === 'base' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex gap-2">
                  <button onClick={() => setBaseTarget('wallet')} className={`flex-1 py-2 rounded border font-bold text-xs ${baseTarget === 'wallet' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-gray-700 text-gray-500'}`}>👛 Porte-monnaie</button>
                  <button onClick={() => setBaseTarget('bank')} className={`flex-1 py-2 rounded border font-bold text-xs ${baseTarget === 'bank' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-gray-700 text-gray-500'}`}>🏦 Banque</button>
              </div>
              <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                <button onClick={() => setBaseAction('add')} className={`flex-1 py-2 text-xs font-bold rounded ${baseAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>+ Ajouter</button>
                <button onClick={() => setBaseAction('remove')} className={`flex-1 py-2 text-xs font-bold rounded ${baseAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>- Retirer</button>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Pièce</label>
                <div className="flex gap-2">
                  {coinOptions.map(c => (
                    <button key={c.v} onClick={() => setBaseCoin(c.v)} className={`flex-1 py-1 rounded border text-xs font-bold ${baseCoin === c.v ? 'bg-white/10 border-white text-white' : 'border-gray-700 text-gray-500'}`}>{c.l}</button>
                  ))}
                </div>
              </div>
              <input type="number" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white font-mono" placeholder="0"/>
              <button onClick={handleBaseMoney} disabled={isLoading || !baseAmount} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 mt-2">Valider</button>
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full py-4 bg-[#111] text-gray-400 hover:text-white font-bold border-t border-gray-700 transition-colors">Fermer</button>
      </div>
    </div>
  );
};

export default MoneyModal;
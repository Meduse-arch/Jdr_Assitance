import React from 'react';

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

const Inventaire = ({ playerData }) => {
  const m = playerData.money;
  
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
      
      {/* Plus de bouton de transfert ici, tout est dans Action > Argent */}
    </div>
  );
};

export default Inventaire;
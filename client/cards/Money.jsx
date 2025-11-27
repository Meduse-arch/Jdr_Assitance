import React from 'react';

const CoinRow = ({ label, value, color }) => (
  <div className={`flex justify-between items-center p-3 bg-[#151515] border border-gray-800 rounded-lg ${color}`}>
    <span className="font-bold text-lg">{value}</span>
    <span className="text-xs font-bold uppercase tracking-wider opacity-60">{label}</span>
  </div>
);

const Money = ({ playerData }) => {
  const m = playerData.money;

  return (
    <div className="animate-fade-in pb-20 relative">
      <div className="text-center mb-6">
        <span className="text-4xl">💰</span>
        <h2 className="text-xl font-bold text-white mt-2">Situation Financière</h2>
      </div>
      
      {/* SECTION PORTE-MONNAIE */}
      <div className="mb-8">
        <h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2 mb-4 flex justify-between items-center">
          <span>👛 Porte-monnaie</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <CoinRow label="Or (PO)" value={m.wallet.po} color="text-yellow-500" />
          <CoinRow label="Argent (PA)" value={m.wallet.pa} color="text-gray-400" />
          <CoinRow label="Cuivre (PC)" value={m.wallet.pc} color="text-orange-600" />
          <CoinRow label="Platine (PP)" value={m.wallet.pp} color="text-slate-300" />
        </div>
      </div>

      {/* SECTION BANQUE */}
      <div className="mb-8">
        <h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2 mb-4">
          🏦 Banque
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <CoinRow label="Or (PO)" value={m.bank.po} color="text-yellow-500 opacity-80" />
          <CoinRow label="Argent (PA)" value={m.bank.pa} color="text-gray-400 opacity-80" />
          <CoinRow label="Cuivre (PC)" value={m.bank.pc} color="text-orange-600 opacity-80" />
          <CoinRow label="Platine (PP)" value={m.bank.pp} color="text-slate-300 opacity-80" />
        </div>
      </div>
      
      <p className="text-center text-xs text-gray-600 italic">
        Utilisez la zone d'Action pour faire des transferts ou modifier les montants.
      </p>
    </div>
  );
};

export default Money;
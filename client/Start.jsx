import React, { useState } from 'react';

const Start = ({ userId, sessionId, onValidation }) => {
  const [creationStats, setCreationStats] = useState({
    force: null, constitution: null, agilite: null, intelligence: null, perception: null
  });
  const [moneyRoll, setMoneyRoll] = useState(null);
  const [rerollsLeft, setRerollsLeft] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rollDice = (count, faces) => {
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += Math.floor(Math.random() * faces) + 1;
    }
    return sum;
  };

  const handleRollStat = (statName) => {
    if (creationStats[statName] !== null) {
      if (rerollsLeft <= 0) return;
      setRerollsLeft(prev => prev - 1);
    }
    const result = rollDice(4, 5);
    setCreationStats(prev => ({ ...prev, [statName]: result }));
  };

  const handleRollMoney = () => {
    if (moneyRoll !== null) return;
    const result = rollDice(1, 100);
    setMoneyRoll(result);
  };

  const getDerived = () => {
    const f = creationStats.force || 0;
    const c = creationStats.constitution || 0;
    const a = creationStats.agilite || 0;
    const i = creationStats.intelligence || 0;
    return {
      hp: c * 4,
      mana: i * 20,
      stam: (f + a) * 10
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/player/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          stats: creationStats,
          money: moneyRoll
        }),
      });
      const data = await res.json();
      
      if (data.success && data.player) {
        // CORRECTION : On passe les données directement pour mettre à jour App.jsx sans attente
        onValidation(data.player); 
      } else {
        alert("Erreur serveur : " + (data.error || "Inconnue"));
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion lors de la création.");
      setIsSubmitting(false);
    }
  };

  const derived = getDerived();
  const allStatsRolled = Object.values(creationStats).every(v => v !== null);
  const moneyRolled = moneyRoll !== null;
  const canValidate = allStatsRolled && moneyRolled;

  return (
    <div className="bg-[#222] border border-gray-700 rounded-xl p-6 shadow-xl animate-fade-in max-w-3xl mx-auto">
      <h3 className="text-2xl font-bold text-indigo-400 mb-2 text-center">🎲 Création de Personnage</h3>
      <p className="text-gray-400 text-sm mb-6 text-center">Lance les dés pour déterminer tes statistiques !</p>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* COLONNE GAUCHE : STATS */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-white font-bold border-b border-gray-600 pb-1">Attributs (4d5)</h4>
            <span className={`text-xs px-2 py-1 rounded ${rerollsLeft > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
              Rerolls dispo : {rerollsLeft}
            </span>
          </div>

          {Object.keys(creationStats).map(stat => {
            const val = creationStats[stat];
            const canReroll = val !== null && rerollsLeft > 0;
            
            return (
              <div key={stat} className="flex items-center justify-between bg-[#151515] p-3 rounded-lg border border-gray-800">
                <span className="text-gray-300 capitalize font-medium w-24">{stat}</span>
                
                <div className="flex items-center gap-3">
                  {val !== null ? (
                    <span className="text-xl font-bold text-indigo-400 w-8 text-center">{val}</span>
                  ) : (
                    <span className="text-gray-600 text-sm w-8 text-center">-</span>
                  )}

                  <button 
                    onClick={() => handleRollStat(stat)}
                    disabled={isSubmitting || (val !== null && rerollsLeft <= 0)}
                    className={`p-2 rounded-full transition-all ${
                      val === null 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:scale-110' 
                        : canReroll 
                          ? 'bg-gray-700 hover:bg-indigo-900 text-indigo-300' 
                          : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    🎲
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* COLONNE DROITE */}
        <div className="flex-1 flex flex-col gap-6">
          
          <div className="bg-[#1a1510] p-4 rounded-lg border border-orange-900/30">
            <h4 className="text-orange-400 font-bold border-b border-orange-900/30 pb-2 mb-3">Bourse (1d100)</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">💰</span>
                {moneyRoll !== null ? (
                  <span className="text-2xl font-bold text-yellow-500">{moneyRoll} <span className="text-xs text-orange-400">PC</span></span>
                ) : (
                  <span className="text-gray-500 text-sm">???</span>
                )}
              </div>
              <button 
                onClick={handleRollMoney}
                disabled={isSubmitting || moneyRoll !== null}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  moneyRoll === null 
                    ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {moneyRoll === null ? "Lancer" : "Fait"}
              </button>
            </div>
          </div>

          <div className="bg-[#10151a] p-4 rounded-lg border border-blue-900/30 flex-1">
            <h4 className="text-blue-400 font-bold border-b border-blue-900/30 pb-2 mb-3">Aperçu</h4>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-400">❤️ PV</span> <span className="text-red-400 font-mono font-bold">{derived.hp}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">💧 Mana</span> <span className="text-blue-400 font-mono font-bold">{derived.mana}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">⚡ Stam</span> <span className="text-green-400 font-mono font-bold">{derived.stam}</span></div>
            </div>
          </div>

        </div>
      </div>

      <button 
        onClick={handleSubmit}
        disabled={!canValidate || isSubmitting}
        className={`w-full mt-8 py-4 font-bold text-lg rounded-xl transition-all transform ${
          canValidate && !isSubmitting
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg hover:scale-[1.02]' 
            : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Création en cours...
          </span>
        ) : canValidate ? "✨ Terminer et créer la fiche" : "Termine tes lancers pour valider"}
      </button>
    </div>
  );
};

export default Start;
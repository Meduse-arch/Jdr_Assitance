import React from 'react';

const GameHome = ({ onSelect, sessionName, onQuit }) => {
  return (
    <div className="flex flex-col min-h-screen w-full max-w-5xl mx-auto p-4 animate-fade-in">
      
      {/* Header simple */}
      <div className="flex justify-between items-center mb-8 px-2">
        <div>
          <h1 className="text-2xl font-bold text-white">JDR Assistance</h1>
          <p className="text-gray-500 text-xs">Session: <span className="text-indigo-400 font-mono">{sessionName}</span></p>
        </div>
        <button onClick={onQuit} className="px-3 py-1 bg-[#1a1a1a] border border-gray-700 rounded text-xs text-gray-400 hover:text-white hover:border-red-500 transition-colors">
          Quitter
        </button>
      </div>
      
      {/* Zone Scindée (Choix) */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 pb-10">
        
        {/* BOUTON GAME */}
        <button 
          onClick={() => onSelect('game')}
          className="flex-1 relative overflow-hidden rounded-3xl group transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-500/20 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]"
        >
          <div className="absolute inset-0 bg-indigo-600/10 group-hover:bg-indigo-600/20 transition-colors"></div>
          <div className="flex flex-col items-center justify-center h-full gap-4 z-10 relative p-6">
            <span className="text-7xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">🎲</span>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-wider">JEU</h2>
              <p className="text-indigo-300 font-medium">Actions & Dés</p>
            </div>
          </div>
        </button>

        {/* BOUTON INFO */}
        <button 
          onClick={() => onSelect('info')}
          className="flex-1 relative overflow-hidden rounded-3xl group transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/20 bg-gradient-to-br from-[#0f2922] to-[#1a1a1a]"
        >
          <div className="absolute inset-0 bg-emerald-600/10 group-hover:bg-emerald-600/20 transition-colors"></div>
          <div className="flex flex-col items-center justify-center h-full gap-4 z-10 relative p-6">
            <span className="text-7xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">📜</span>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-wider">INFOS</h2>
              <p className="text-emerald-300 font-medium">Fiche, Sac & Argent</p>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
};

export default GameHome;
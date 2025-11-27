import React, { useState, useEffect } from 'react';

const Hub = ({ user, isAdmin, sessionList, onJoin, onRefresh, onAdminMode }) => {
  const [selectedSessionId, setSelectedSessionId] = useState("");

  useEffect(() => {
    if (sessionList.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessionList[0]);
    }
  }, [sessionList]);

  return (
    <div className="w-full max-w-lg mx-auto mt-10">
      <h1 className="text-4xl font-bold mb-8 text-white">JDR Assistance</h1>
      <p className="mb-6 text-gray-400">Bienvenue, <span className="text-indigo-400">{user.username}</span></p>
      
      {/* CARTE JOUEUR */}
      <div className="bg-[#222] p-6 rounded-xl border border-gray-700 shadow-2xl mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-200">Rejoindre une partie</h3>
        
        {sessionList.length === 0 ? (
          <p className="text-gray-500 italic my-4">Aucune session active.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <select 
                className="w-full p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessionList.map(sess => <option key={sess} value={sess}>Session : {sess}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <button 
              onClick={() => onJoin(selectedSessionId)} 
              disabled={!selectedSessionId}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Rejoindre la partie
            </button>
          </div>
        )}
        
        <button onClick={() => onRefresh()} className="mt-4 text-sm text-gray-500 hover:text-white underline bg-transparent border-none cursor-pointer">
          Actualiser la liste
        </button>
      </div>

      {/* BOUTON ADMIN */}
      {isAdmin && (
        <div className="flex justify-center mt-8">
          <button 
            onClick={onAdminMode}
            className="px-6 py-2 bg-orange-900/30 border border-orange-600/50 text-orange-400 rounded-lg hover:bg-orange-800/50 hover:text-white transition-all flex items-center gap-2 font-bold shadow-lg"
          >
            <span>👑</span> Admin Mode
          </button>
        </div>
      )}
    </div>
  );
};

export default Hub;
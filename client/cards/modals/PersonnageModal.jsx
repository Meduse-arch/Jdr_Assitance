import React, { useState } from 'react';

const PersonnageModal = ({ isOpen, onClose, auth, sessionId, onRefresh }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('resources'); // resources, attributes, repos
  const [isLoading, setIsLoading] = useState(false);

  // --- ÉTATS RESSOURCES ---
  const [resTarget, setResTarget] = useState('hp');
  const [resAction, setResAction] = useState('remove');
  const [resValue, setResValue] = useState("");

  // --- ÉTATS ATTRIBUTS ---
  const [attrTarget, setAttrTarget] = useState('force');
  const [attrAction, setAttrAction] = useState('add');
  const [attrValue, setAttrValue] = useState("1");

  const statsList = [
    { id: 'force', label: 'Force' }, { id: 'constitution', label: 'Const' },
    { id: 'agilite', label: 'Agi' }, { id: 'intelligence', label: 'Intel' },
    { id: 'perception', label: 'Perc' }
  ];

  // --- API HANDLERS ---
  const handleResourceMod = async () => {
    const val = parseInt(resValue);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/resource", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          username: auth.user.username,
          session_id: sessionId, 
          target: resTarget, 
          action: resAction, 
          value: val 
        }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setResValue(""); } 
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleAttributeMod = async () => {
    const val = parseInt(attrValue);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/stat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          username: auth.user.username,
          session_id: sessionId, 
          stat: attrTarget, 
          action: attrAction, 
          value: val 
        }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setAttrValue("1"); } 
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleRepos = async (type, target = null) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/repos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          username: auth.user.username,
          session_id: sessionId, 
          type, 
          target 
        }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); onClose(); } // On ferme après un repos car c'est une action ponctuelle
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const tabClass = (id, color) => `flex-1 py-3 text-xs sm:text-sm font-bold uppercase transition-colors border-b-2 ${activeTab === id ? `border-${color}-500 text-${color}-400 bg-white/5` : 'border-transparent text-gray-500 hover:text-gray-300'}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#222] border border-gray-600 w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* TABS */}
        <div className="flex bg-[#151515] border-b border-gray-700">
          <button onClick={() => setActiveTab('resources')} className={tabClass('resources', 'emerald')}>Ressources</button>
          <button onClick={() => setActiveTab('attributes')} className={tabClass('attributes', 'purple')}>Attributs</button>
          <button onClick={() => setActiveTab('repos')} className={tabClass('repos', 'blue')}>Repos</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* --- RESSOURCES --- */}
          {activeTab === 'resources' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex gap-2">
                {[{ id: 'hp', l: 'HP', c: 'border-red-500 text-red-400' }, { id: 'mana', l: 'Mana', c: 'border-blue-500 text-blue-400' }, { id: 'stam', l: 'Stam', c: 'border-green-500 text-green-400' }].map(t => (
                  <button key={t.id} onClick={() => setResTarget(t.id)} className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-all ${resTarget === t.id ? `bg-white/10 ${t.c}` : 'border-gray-700 text-gray-500 hover:bg-white/5'}`}>{t.l}</button>
                ))}
              </div>
              <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                <button onClick={() => setResAction('remove')} className={`flex-1 py-2 rounded font-bold text-sm ${resAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>- Retirer</button>
                <button onClick={() => setResAction('add')} className={`flex-1 py-2 rounded font-bold text-sm ${resAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>+ Ajouter</button>
              </div>
              <input type="number" value={resValue} onChange={(e) => setResValue(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg p-3 text-center text-white text-xl font-bold outline-none" placeholder="0"/>
              <button onClick={handleResourceMod} disabled={isLoading || !resValue} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50">Valider</button>
            </div>
          )}

          {/* --- ATTRIBUTS --- */}
          {activeTab === 'attributes' && (
            <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-3 gap-2">
                  {statsList.map(s => (
                    <button key={s.id} onClick={() => setAttrTarget(s.id)} className={`py-2 text-xs font-bold rounded border transition-colors ${attrTarget === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-500 hover:text-white'}`}>{s.label}</button>
                  ))}
                </div>
                <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                  <button onClick={() => setAttrAction('remove')} className={`flex-1 py-2 rounded font-bold text-sm ${attrAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>- Retirer</button>
                  <button onClick={() => setAttrAction('add')} className={`flex-1 py-2 rounded font-bold text-sm ${attrAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>+ Ajouter</button>
                </div>
                <input type="number" value={attrValue} onChange={(e) => setAttrValue(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg p-3 text-center text-white text-xl font-bold outline-none" placeholder="1"/>
                <button onClick={handleAttributeMod} disabled={isLoading || !attrValue} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50">Valider</button>
                <p className="text-[10px] text-gray-500 text-center italic">Modifie les max (HP/Mana/Stam).</p>
            </div>
          )}

          {/* --- REPOS --- */}
          {activeTab === 'repos' && (
            <div className="space-y-3 animate-fade-in">
              <button onClick={() => handleRepos('long')} disabled={isLoading} className="w-full p-4 bg-[#1a1a2e] border border-indigo-500/50 hover:bg-indigo-900/30 rounded-lg text-left group transition-all"><div className="font-bold text-indigo-300 group-hover:text-white">✨ Repos Long</div><div className="text-xs text-gray-500 group-hover:text-gray-300">HP, Mana, Stamina Max</div></button>
              <button onClick={() => handleRepos('court')} disabled={isLoading} className="w-full p-4 bg-[#1a2e1a] border border-green-500/50 hover:bg-green-900/30 rounded-lg text-left group transition-all"><div className="font-bold text-green-300 group-hover:text-white">💫 Repos Court</div><div className="text-xs text-gray-500 group-hover:text-gray-300">Mana, Stamina Max</div></button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleRepos('simple', 'mana')} disabled={isLoading} className="p-3 bg-[#111] border border-blue-500/30 hover:bg-blue-900/20 rounded-lg text-blue-400 font-bold transition-all">💧 Mana</button>
                <button onClick={() => handleRepos('simple', 'stam')} disabled={isLoading} className="p-3 bg-[#111] border border-yellow-500/30 hover:bg-yellow-900/20 rounded-lg text-yellow-400 font-bold transition-all">⚡ Stam</button>
              </div>
            </div>
          )}

        </div>
        <button onClick={onClose} className="w-full py-4 bg-[#111] text-gray-400 hover:text-white font-bold border-t border-gray-700 transition-colors">Fermer</button>
      </div>
    </div>
  );
};

export default PersonnageModal;
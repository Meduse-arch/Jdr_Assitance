import React, { useState } from 'react';

const CreateItemModal = ({ isOpen, onClose, auth, sessionId, onRefresh }) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("consommable");
  const [slot, setSlot] = useState("corp");
  const [count, setCount] = useState(1);
  const [description, setDescription] = useState("");
  const [modifiers, setModifiers] = useState([]);

  const itemTypes = [
    { v: 'consommable', l: 'Consommable' },
    { v: 'arme', l: 'Arme' },
    { v: 'armure', l: 'Armure' },
    { v: 'bijoux', l: 'Bijoux' },
    { v: 'materiaux', l: 'Matériau' },
    { v: 'autres', l: 'Autre' }
  ];

  const armorSlots = [
    { v: 'tete', l: 'Tête' },
    { v: 'corp', l: 'Corps' },
    { v: 'dos', l: 'Dos' },
    { v: 'pantalon', l: 'Pantalon' },
    { v: 'pied', l: 'Pied' }
  ];

  const statsOptions = [
    { v: 'hp', l: 'PV' }, { v: 'mana', l: 'Mana' }, { v: 'stam', l: 'Stamina' },
    { v: 'force', l: 'Force' }, { v: 'constitution', l: 'Const.' },
    { v: 'agilite', l: 'Agilité' }, { v: 'intelligence', l: 'Intel.' }, { v: 'perception', l: 'Perc.' },
    { v: 'modEffect', l: 'Sort' } // <--- RENOMMÉ ICI
  ];

  const addModifier = () => setModifiers([...modifiers, { stat: 'hp', value: 10 }]);
  const updateModifier = (index, field, val) => { const n = [...modifiers]; n[index][field] = val; setModifiers(n); };
  const removeModifier = (index) => setModifiers(modifiers.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!name) return alert("Il faut un nom !");
    setIsLoading(true);

    const modifiersObj = {};
    modifiers.forEach(m => { modifiersObj[m.stat] = parseInt(m.value) || 0; });

    const newItem = {
      name, type,
      count: parseInt(count) || 1,
      description,
      modifiers: modifiersObj,
      slot: type === 'armure' ? slot : null 
    };

    try {
      const res = await fetch("/api/player/inventory/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, item: newItem }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh(); onClose();
        setName(""); setDescription(""); setModifiers([]);
      } else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#222] border border-gray-600 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#1a1a1a] border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-white font-bold">🛠️ Créer un Objet</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Nom</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white" placeholder="Ex: Bâton de Feu" />
                </div>
                <div className="w-1/3">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white outline-none">
                        {itemTypes.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                </div>
            </div>

            {type === 'armure' && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-2 rounded">
                    <label className="text-[10px] text-blue-300 uppercase font-bold block mb-1">Emplacement</label>
                    <select value={slot} onChange={e => setSlot(e.target.value)} className="w-full bg-[#111] border border-blue-500/50 rounded p-2 text-white outline-none">
                        {armorSlots.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                </div>
            )}

            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white text-sm" placeholder="Effet..." />
                </div>
                <div className="w-20">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Qté</label>
                    <input type="number" value={count} onChange={e => setCount(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white text-center" />
                </div>
            </div>

            <div className="bg-[#151515] p-3 rounded border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-indigo-400 font-bold uppercase">⚡ Bonus / Stats</label>
                    <button onClick={addModifier} className="text-[10px] bg-indigo-900 text-indigo-200 px-2 py-1 rounded hover:bg-indigo-700">+ Ajouter</button>
                </div>
                <div className="space-y-2">
                    {modifiers.map((mod, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <select value={mod.stat} onChange={e => updateModifier(idx, 'stat', e.target.value)} className="flex-1 bg-black border border-gray-600 rounded p-1 text-white text-xs">
                                {statsOptions.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                            </select>
                            <input type="number" value={mod.value} onChange={e => updateModifier(idx, 'value', e.target.value)} className="w-16 bg-black border border-gray-600 rounded p-1 text-white text-xs text-center" placeholder="+/-" />
                            <button onClick={() => removeModifier(idx)} className="text-red-500 hover:text-red-400 px-1 font-bold">×</button>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={handleSubmit} disabled={isLoading} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all disabled:opacity-50">
                {isLoading ? "Création..." : "✨ Créer l'objet"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemModal;
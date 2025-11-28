import React, { useState } from 'react';

const CreateItemModal = ({ isOpen, onClose, auth, sessionId, onRefresh }) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  
  // Données de base de l'objet
  const [name, setName] = useState("");
  const [type, setType] = useState("consommable");
  const [count, setCount] = useState(1);
  const [description, setDescription] = useState("");

  // Gestion des modificateurs (Liste dynamique)
  const [modifiers, setModifiers] = useState([]); // [{ stat: 'hp', value: 10 }]

  const itemTypes = [
    { v: 'consommable', l: 'Consommable' },
    { v: 'arme', l: 'Arme' },
    { v: 'armure', l: 'Armure' },
    { v: 'bijoux', l: 'Bijoux' },
    { v: 'materiaux', l: 'Matériau' },
    { v: 'autres', l: 'Autre' }
  ];

  const statsOptions = [
    { v: 'hp', l: 'PV (Soin/Dégât)' },
    { v: 'mana', l: 'Mana' },
    { v: 'stam', l: 'Stamina' },
    { v: 'force', l: 'Force' },
    { v: 'constitution', l: 'Constitution' },
    { v: 'agilite', l: 'Agilité' },
    { v: 'intelligence', l: 'Intelligence' },
    { v: 'perception', l: 'Perception' }
  ];

  // Ajouter une ligne de modificateur
  const addModifier = () => {
    setModifiers([...modifiers, { stat: 'hp', value: 10 }]);
  };

  // Mettre à jour une ligne
  const updateModifier = (index, field, val) => {
    const newMods = [...modifiers];
    newMods[index][field] = val;
    setModifiers(newMods);
  };

  // Supprimer une ligne
  const removeModifier = (index) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name) return alert("Il faut un nom !");
    setIsLoading(true);

    // Transformation du tableau modifiers en objet { hp: 10, force: 3 } pour le serveur
    const modifiersObj = {};
    modifiers.forEach(m => {
        modifiersObj[m.stat] = parseInt(m.value) || 0;
    });

    const newItem = {
      name,
      type,
      count: parseInt(count) || 1,
      description,
      modifiers: modifiersObj
    };

    try {
      const res = await fetch("/api/player/inventory/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          session_id: sessionId, 
          item: newItem 
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh(); // Rafraichir l'app
        onClose();   // Fermer la modale
        // Reset form
        setName(""); setDescription(""); setModifiers([]);
      } else {
        alert("Erreur: " + data.error);
      }
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
            
            {/* Nom & Type */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Nom</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white" placeholder="Ex: Épée longue" />
                </div>
                <div className="w-1/3">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white outline-none">
                        {itemTypes.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                </div>
            </div>

            {/* Description & Quantité */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Description</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white text-sm" placeholder="Effet, lore..." />
                </div>
                <div className="w-20">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Qté</label>
                    <input type="number" value={count} onChange={e => setCount(e.target.value)} className="w-full bg-[#111] border border-gray-600 rounded p-2 text-white text-center" />
                </div>
            </div>

            {/* MODIFICATEURS */}
            <div className="bg-[#151515] p-3 rounded border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-indigo-400 font-bold uppercase">⚡ Modificateurs / Bonus</label>
                    <button onClick={addModifier} className="text-[10px] bg-indigo-900 text-indigo-200 px-2 py-1 rounded hover:bg-indigo-700">+ Ajouter</button>
                </div>
                
                {modifiers.length === 0 && <p className="text-gray-600 text-xs italic text-center py-2">Aucun effet spécial.</p>}

                <div className="space-y-2">
                    {modifiers.map((mod, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <select value={mod.stat} onChange={e => updateModifier(idx, 'stat', e.target.value)} className="flex-1 bg-black border border-gray-600 rounded p-1 text-white text-xs">
                                {statsOptions.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                            </select>
                            <input type="number" value={mod.value} onChange={e => updateModifier(idx, 'value', e.target.value)} className="w-16 bg-black border border-gray-600 rounded p-1 text-white text-xs text-center" placeholder="+1" />
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
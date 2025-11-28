import React, { useState, useEffect } from 'react';
import VerticalMenu from './VerticalMenu'; 
import AdminConsole from './cards/admin/AdminConsole';
import AdminSession from './cards/admin/AdminSession';
import AdminFiche from './cards/admin/AdminFiche';

const Admin = ({ accessToken, guildId, sessionList, onRefresh, onQuit, onMasquerade, initialState }) => {
  const [logs, setLogs] = useState([]);
  
  // Définition des items AVANT pour pouvoir calculer l'index initial
  const menuItems = [
    { id: 'console', label: 'Console', icon: '📟' },
    { id: 'session', label: 'Sessions', icon: '🌍' },
    { id: 'fiche', label: 'Personnages', icon: '📝' }
  ];

  // 1. Calcul de l'index de départ selon l'état sauvegardé (ou 0 par défaut)
  const startCategory = initialState?.category || 'console';
  const startIndex = menuItems.findIndex(i => i.id === startCategory);
  
  const [activeCategory, setActiveCategory] = useState(startCategory);
  const [menuIndex, setMenuIndex] = useState(startIndex >= 0 ? startIndex : 0);

  // 2. SYNCHRONISATION AUTOMATIQUE
  // Dès que menuIndex change (molette ou clic), on met à jour la catégorie
  useEffect(() => {
    const targetCategory = menuItems[menuIndex].id;
    if (targetCategory !== activeCategory) {
      setActiveCategory(targetCategory);
    }
  }, [menuIndex]); // <-- Déclencheur : changement d'index

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/admin/logs");
        const data = await res.json();
        setLogs(data);
      } catch (e) { console.error("Logs error", e); }
    };
    fetchLogs(); 
    const interval = setInterval(fetchLogs, 2000); 
    return () => clearInterval(interval);
  }, []);

  const renderMainContent = () => {
    switch (activeCategory) {
      case 'session':
        return (
          <AdminSession 
            accessToken={accessToken}
            guildId={guildId}
            sessionList={sessionList}
            onRefresh={onRefresh}
          />
        );
      case 'fiche':
        return (
          <AdminFiche
            accessToken={accessToken}
            guildId={guildId}
            sessionList={sessionList}
            onMasquerade={onMasquerade}
            initialSession={initialState?.session}
            initialTab={initialState?.tab}
          />
        );
      case 'console':
      default:
        return <AdminConsole logs={logs} />;
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4 animate-fade-in bg-[#0a0a0a] w-full max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-2 flex-none">
        <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2"><span>👑</span> Panneau Admin</h1>
        <div className="flex items-center gap-4">
             <span className="text-xs text-gray-500 font-mono hidden sm:inline">Session ID: {guildId}</span>
             <button onClick={onQuit} className="px-3 py-1 bg-[#222] border border-gray-700 rounded text-sm text-gray-400 hover:text-white transition-colors">
                Quitter le mode Admin
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* ZONE PRINCIPALE (GAUCHE) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#111] border border-gray-800 rounded-xl overflow-hidden relative shadow-lg transition-all duration-300">
            <div className="flex-1 h-full p-2">
                {renderMainContent()}
            </div>
        </div>

        {/* BARRE LATÉRALE (DROITE) */}
        <div className="md:w-1/4 min-w-[280px] flex flex-col bg-[#111] border border-gray-800 rounded-xl p-4 h-full">
          <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider text-center border-b border-gray-800 pb-2">
            Menu Navigation
          </h2>
          
          <div className="flex-1 flex flex-col justify-center">
            <VerticalMenu 
              items={menuItems} 
              activeIndex={menuIndex} 
              onNavigate={setMenuIndex} 
              onSelect={() => {}} // Plus besoin d'action au clic, c'est automatique
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Admin;
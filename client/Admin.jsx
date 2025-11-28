import React, { useState, useEffect } from 'react';
import Carousel from './Carousel'; 
import VerticalMenu from './VerticalMenu'; // Votre nouveau menu vertical
import AdminConsole from './cards/admin/AdminConsole';
import AdminSession from './cards/admin/AdminSession';
import AdminFiche from './cards/admin/AdminFiche'; // <--- TRES IMPORTANT

const Admin = ({ accessToken, guildId, sessionList, onRefresh, onQuit, onMasquerade }) => {
  const [logs, setLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuIndex, setMenuIndex] = useState(0);

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

  const menuItems = [
    { id: 'session', label: 'Session', icon: '🌍' },
    { id: 'fiche', label: 'Fiches', icon: '📝' } // La carte qui posait problème
  ];

  const renderAdminCard = () => {
    switch (activeCategory) {
      case 'session':
        return (
          <AdminSession 
            accessToken={accessToken}
            guildId={guildId}
            sessionList={sessionList}
            onRefresh={onRefresh}
            onBack={() => setActiveCategory(null)}
          />
        );
      case 'fiche':
        return (
          <AdminFiche
            accessToken={accessToken}
            guildId={guildId}
            sessionList={sessionList} // S'assurer que cette prop arrive bien
            onMasquerade={onMasquerade}
            onBack={() => setActiveCategory(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4 animate-fade-in bg-[#0a0a0a] w-full max-w-6xl mx-auto">
      
      <div className="flex justify-between items-center border-b border-gray-800 pb-2 flex-none">
        <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2"><span>👑</span> Panneau Admin</h1>
        <button onClick={onQuit} className="px-3 py-1 bg-[#222] border border-gray-700 rounded text-sm text-gray-400 hover:text-white transition-colors">
          Quitter le mode Admin
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <AdminConsole logs={logs} />

        <div className="md:w-1/3 min-w-[320px] flex flex-col bg-[#111] border border-gray-800 rounded-xl p-4 h-full relative">
          <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider text-center z-10">
            {activeCategory ? (activeCategory === 'fiche' ? 'Gestion Personnages' : 'Gestion Session') : 'Menu Gestion'}
          </h2>
          
          {!activeCategory ? (
            <div className="flex-1 flex flex-col justify-center">
              <VerticalMenu 
                items={menuItems} 
                activeIndex={menuIndex} 
                onNavigate={setMenuIndex} 
                onSelect={(item) => setActiveCategory(item.id)} 
              />
              <p className="text-center text-[10px] text-gray-600 mt-2">Utilisez la molette pour défiler</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
                {renderAdminCard()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
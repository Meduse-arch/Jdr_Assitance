import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import Hub from './Hub';
import Start from './Start';
import "./style.css";

const discordSdk = new DiscordSDK(process.env.CLIENT_ID);

function App() {
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Démarrage...");
  
  const [sessionList, setSessionList] = useState([]);
  const [playerData, setPlayerData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [currentSession, setCurrentSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1);
  const [openedCategory, setOpenedCategory] = useState(null);

  const menuItems = [
    { id: 'outils', label: 'Action', icon: '🎲' },
    { id: 'fiche', label: 'Statut', icon: '📜' },
    { id: 'argent', label: 'Argent', icon: '💰' }
  ];

  useEffect(() => {
    async function setupDiscord() {
      try {
        setStatus("Connexion Discord...");
        await discordSdk.ready();
        const { code } = await discordSdk.commands.authorize({
          client_id: process.env.CLIENT_ID,
          response_type: "code", state: "", prompt: "none", 
          scope: ["identify", "guilds", "guilds.members.read"],
        });
        const response = await fetch("/api/token", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();
        const authData = await discordSdk.commands.authenticate({ access_token });
        setAuth(authData);
        setStatus("Connecté");
        
        fetchSessions();
        checkAdminStatus(access_token);
      } catch (error) {
        console.error(error);
        setStatus("Erreur (Relance l'activité)");
      }
    }
    setupDiscord();
  }, []);

  const checkAdminStatus = async (token) => {
    try {
      const res = await fetch("/api/check-admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, guild_id: discordSdk.guildId }),
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) { console.error("Admin check error", e); }
  };

  const fetchSessions = async (newList = null) => {
    if (newList) { setSessionList(newList); return; }
    try {
      const res = await fetch("/api/sessions");
      const list = await res.json();
      setSessionList(list);
    } catch (e) { console.error("Erreur sessions", e); }
  };

  const fetchPlayerData = async () => {
    if (!auth || !currentSession) return;
    try {
      const res = await fetch("/api/player", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: currentSession }),
      });
      const data = await res.json();
      setPlayerData(data);
    } catch (e) { console.error("Erreur player data", e); }
  };

  useEffect(() => {
    if (currentSession) fetchPlayerData();
  }, [currentSession, openedCategory]);

  const handleJoinSession = async (sessionId) => {
    setStatus(`Connexion à ${sessionId}...`);
    try {
      const res = await fetch("/api/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) setCurrentSession(data.session_id);
    } catch (e) { setStatus("Erreur serveur"); }
  };

  // --- AFFICHAGE ---

  if (!auth) return <div className="flex h-screen items-center justify-center text-xl text-gray-400 animate-pulse"><p>{status}</p></div>;

  // 1. HUB
  if (!currentSession) {
    return (
      <Hub 
        user={auth.user} isAdmin={isAdmin} sessionList={sessionList}
        onJoin={handleJoinSession} onRefresh={fetchSessions}
        accessToken={auth.access_token} guildId={discordSdk.guildId}
      />
    );
  }

  // 2. NAVIGATION (Détail ou Création)
  const renderDetailPage = () => {
    // Si pas de fiche -> CRÉATION
    if (!playerData) {
      return (
        <Start 
          userId={auth.user.id} 
          sessionId={currentSession} 
          onValidation={fetchPlayerData} 
        />
      );
    }

    // --- ECRANS DE JEU ---
    // J'ai renommé la variable ici pour éviter le conflit : 'activeItem' au lieu de 'item'
    const activeItem = menuItems.find(i => i.id === openedCategory);

    if (openedCategory === 'statut') {
      const j = playerData.joueur;
      return (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
            {[{ l: 'Force', v: j.force }, { l: 'Const', v: j.constitution }, { l: 'Agilité', v: j.agilite }, { l: 'Intel', v: j.intelligence }, { l: 'Perc', v: j.perception }].map(s => (
              <div key={s.l} className="bg-[#151515] border border-gray-700 p-2 rounded-lg text-center shadow-sm">
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{s.l}</span>
                <span className="text-xl font-bold text-indigo-400">{s.v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-gray-700/50 pt-4">
            {[{ l: 'HP', v: j.hp, m: j.hpMax, c: 'text-red-400', b: 'bg-red-500' }, { l: 'Mana', v: j.mana, m: j.manaMax, c: 'text-blue-400', b: 'bg-blue-500' }, { l: 'Stam', v: j.stam, m: j.stamMax, c: 'text-green-400', b: 'bg-green-500' }].map(r => (
              <div key={r.l} className="bg-[#151515] rounded-lg p-3 relative overflow-hidden border border-gray-800">
                <div className={`absolute left-0 top-0 bottom-0 opacity-10 ${r.b}`} style={{width: `${(r.v/r.m)*100}%`, transition: 'width 0.5s'}}></div>
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-gray-400 font-medium text-sm">{r.l}</span>
                  <span className={`font-bold font-mono ${r.c}`}>{r.v} <span className="text-gray-600 text-xs">/ {r.m}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (openedCategory === 'argent') {
      const m = playerData.money;
      const CoinGrid = ({ coins }) => (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[{ l: 'PO', v: coins.po, c: 'text-yellow-500', b: 'border-yellow-500/30 bg-yellow-500/5' }, { l: 'PA', v: coins.pa, c: 'text-gray-300', b: 'border-gray-400/30 bg-gray-400/5' }, { l: 'PC', v: coins.pc, c: 'text-orange-600', b: 'border-orange-700/30 bg-orange-700/5' }, { l: 'PP', v: coins.pp, c: 'text-slate-200', b: 'border-slate-300/30 bg-slate-300/5' }].map((coin) => (
            <div key={coin.l} className={`p-3 rounded-lg border ${coin.b} flex justify-between items-center`}>
              <span className={`font-bold ${coin.c}`}>{coin.v}</span><span className={`text-xs font-bold opacity-50 ${coin.c}`}>{coin.l}</span>
            </div>
          ))}
        </div>
      );
      return (
        <div className="space-y-8 animate-fade-in">
          <div><h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2">👛 Porte-monnaie</h3><CoinGrid coins={m.wallet} /></div>
          <div><h3 className="text-sm uppercase tracking-widest text-gray-500 font-semibold border-b border-gray-700 pb-2">🏦 Banque</h3><CoinGrid coins={m.bank} /></div>
        </div>
      );
    }

    // Action
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
        {/* Correction ici : activeItem au lieu de item */}
        <span className="text-6xl mb-4 block filter drop-shadow-lg">{activeItem.icon}</span>
        <h2 className="text-2xl font-bold text-white mb-2">Zone d'Actions</h2>
        <p className="text-gray-400">Session : <span className="text-indigo-400 font-mono">{currentSession}</span></p>
        <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-200 text-sm">
          <p>Utilise les commandes slash du bot :</p>
          <p className="font-mono mt-1 bg-black/30 p-1 rounded">/roll</p>
        </div>
      </div>
    );
  };

  // Si on doit afficher une page détail (soit une catégorie ouverte, soit création perso car !playerData)
  if (openedCategory || (!playerData && currentSession)) {
    const currentItem = menuItems.find(i => i.id === openedCategory);
    
    return (
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col">
        {/* Le Header n'apparait QUE si on a déjà une fiche (donc pas en mode création) */}
        {playerData && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]/80 backdrop-blur sticky top-0 z-50">
            <button 
              onClick={() => setOpenedCategory(null)} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5 text-xs font-bold uppercase tracking-widest"
            >
              <span>&#8592;</span> Retour
            </button>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{currentItem?.icon}</span> {currentItem?.label}
            </h2>
            <div className="w-16"></div>
          </div>
        )}

        <div className="flex-1 p-4 overflow-y-auto">
          {renderDetailPage()}
        </div>
      </div>
    );
  }

  // 3. MENU PRINCIPAL (Carrousel)
  return (
    <div className="w-full max-w-2xl mx-auto pb-10 pt-4 px-4 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-6 px-4 py-3 bg-[#1a1a1a] rounded-full border border-gray-800 shadow-md">
        <span className="text-sm text-gray-400">Session: <strong className="text-white ml-1">{currentSession}</strong></span>
        <button onClick={() => setCurrentSession(null)} className="px-4 py-1 text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors">
          Menu
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-gray-500 mb-2">Menu Principal</h2>
        <p className="text-gray-600 text-sm mb-8">Choisis une catégorie</p>
        <Carousel items={menuItems} activeIndex={activeIndex} onNavigate={setActiveIndex} onOpen={(item) => setOpenedCategory(item.id)} />
      </div>
    </div>
  );
}

export default App;
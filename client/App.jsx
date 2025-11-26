import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import "./style.css";

const discordSdk = new DiscordSDK(process.env.CLIENT_ID);

function App() {
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Démarrage...");
  
  // Données
  const [sessionList, setSessionList] = useState([]);
  const [playerData, setPlayerData] = useState(null);
  
  // Navigation / États
  const [currentSession, setCurrentSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1);
  
  // États Interface
  const [selectedSessionId, setSelectedSessionId] = useState(""); // Pour rejoindre
  
  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [overwriteWarning, setOverwriteWarning] = useState(null);
  
  // NOUVEAU : États pour la suppression
  const [sessionToDelete, setSessionToDelete] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const menuItems = [
    { id: 'outils', label: 'Outils', icon: '🎲' },
    { id: 'fiche', label: 'Fiche', icon: '📜' },
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, guild_id: discordSdk.guildId }),
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) { console.error("Admin check error", e); }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const list = await res.json();
      setSessionList(list);
      
      // Initialiser les sélections par défaut s'il y a des sessions
      if (list.length > 0) {
        if (!selectedSessionId) setSelectedSessionId(list[0]);
        if (!sessionToDelete) setSessionToDelete(list[0]);
      } else {
        setSessionToDelete(""); // Plus rien à supprimer
      }
    } catch (e) { console.error("Erreur sessions", e); }
  };

  const fetchPlayerData = async () => {
    if (!auth || !currentSession) return;
    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: currentSession }),
      });
      const data = await res.json();
      setPlayerData(data);
    } catch (e) { console.error("Erreur player data", e); }
  };

  useEffect(() => {
    if (currentSession) fetchPlayerData();
  }, [currentSession, activeIndex]);

  const handleJoinSession = async () => {
    if (!selectedSessionId) return;
    setStatus(`Connexion à ${selectedSessionId}...`);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: selectedSessionId }),
      });
      const data = await res.json();
      if (data.success) setCurrentSession(data.session_id);
    } catch (e) { setStatus("Erreur serveur"); }
  };

  // --- FONCTIONS ADMIN ---
  const handleCreateSession = async (force = false) => {
    if (!newSessionName.trim()) return;
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: auth.access_token, 
          guild_id: discordSdk.guildId, 
          session_id: newSessionName.trim(),
          force 
        }),
      });
      
      if (res.status === 409) {
        setOverwriteWarning(newSessionName);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSessionList(data.list);
        setSessionToDelete(data.list[0]); // Mettre à jour la liste de suppression aussi
        setNewSessionName("");
        setOverwriteWarning(null);
        alert("Session créée !");
      }
    } catch (e) { alert("Erreur création"); }
  };

  // Lancer la confirmation
  const initiateDelete = () => {
    if (sessionToDelete) setShowDeleteConfirm(true);
  };

  // Confirmer la suppression
  const confirmDeleteSession = async () => {
    try {
      const res = await fetch("/api/sessions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: auth.access_token, 
          guild_id: discordSdk.guildId, 
          session_id: sessionToDelete
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionList(data.list);
        // Reset des sélections
        const nextSession = data.list.length > 0 ? data.list[0] : "";
        setSessionToDelete(nextSession);
        setSelectedSessionId(nextSession);
        setShowDeleteConfirm(false); // Cacher la confirmation
      }
    } catch (e) { alert("Erreur suppression"); }
  };

  if (!auth) return <div className="app-container"><h1>🚀 JDR Assistance</h1><p>{status}</p></div>;

  // --- ECRAN D'ACCUEIL (HUB) ---
  if (!currentSession) {
    return (
      <div className="app-container">
        <h1>Bienvenue, {auth.user.username}</h1>
        
        {/* Carte JOUEUR */}
        <div className="card">
          <h3>Rejoindre une partie</h3>
          {sessionList.length === 0 ? (
            <p style={{color: '#aaa'}}>Aucune session active.</p>
          ) : (
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <select 
                className="session-select"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessionList.map(sess => <option key={sess} value={sess}>Session : {sess}</option>)}
              </select>
              <button onClick={handleJoinSession} className="btn-validate" disabled={!selectedSessionId}>
                Rejoindre la partie
              </button>
            </div>
          )}
          <button onClick={fetchSessions} className="btn-link">Actualiser</button>
        </div>

        {/* Carte ADMIN */}
        {isAdmin && (
          <div className="admin-panel">
            <h3>👑 Zone MJ (Admin)</h3>
            
            {/* Création */}
            <div className="create-box">
              <input 
                type="text" 
                placeholder="Nom nouvelle session"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="admin-input"
              />
              <button onClick={() => handleCreateSession(false)} className="btn-create">Créer</button>
            </div>

            {/* Alerte Création Doublon */}
            {overwriteWarning && (
              <div className="warning-box">
                <p>⚠️ La session "<strong>{overwriteWarning}</strong>" existe déjà !</p>
                <button onClick={() => handleCreateSession(true)} className="btn-danger">Écraser (Reset)</button>
                <button onClick={() => setOverwriteWarning(null)} className="btn-cancel">Annuler</button>
              </div>
            )}

            <hr style={{borderColor: '#e67e22', opacity: 0.3, margin: '20px 0'}} />

            {/* Zone Suppression */}
            <h4 style={{textAlign: 'left', marginBottom: '10px', color:'#e67e22'}}>Supprimer une session :</h4>
            
            {sessionList.length > 0 ? (
              <>
                <div className="delete-row">
                  <select 
                    className="session-select delete-select"
                    value={sessionToDelete}
                    onChange={(e) => {
                      setSessionToDelete(e.target.value);
                      setShowDeleteConfirm(false); // Cache la confirmation si on change de cible
                    }}
                  >
                    {sessionList.map(sess => <option key={sess} value={sess}>{sess}</option>)}
                  </select>
                  
                  <button onClick={initiateDelete} className="btn-icon-delete" title="Supprimer">
                    🗑️
                  </button>
                </div>

                {/* Confirmation Suppression */}
                {showDeleteConfirm && (
                  <div className="confirm-delete-box">
                    <p>Es-tu sûr de vouloir supprimer définitivement <strong>"{sessionToDelete}"</strong> ?</p>
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                      <button onClick={confirmDeleteSession} className="btn-danger">Oui, supprimer</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn-cancel">Non</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{fontStyle:'italic', color:'#666'}}>Rien à supprimer.</p>
            )}

          </div>
        )}
      </div>
    );
  }

  // --- ECRAN DE JEU ---
  const renderGameContent = () => {
    const item = menuItems[activeIndex];
    if (!playerData) return <div className="loading">Chargement...</div>;

    if (item.id === 'fiche') {
      const j = playerData.joueur;
      return (
        <div className="content-panel fiche-panel">
          <div className="stats-grid">
            <div className="stat-box"><strong>Force</strong><span>{j.force}</span></div>
            <div className="stat-box"><strong>Const</strong><span>{j.constitution}</span></div>
            <div className="stat-box"><strong>Agilité</strong><span>{j.agilite}</span></div>
            <div className="stat-box"><strong>Intel</strong><span>{j.intelligence}</span></div>
            <div className="stat-box"><strong>Perc</strong><span>{j.perception}</span></div>
          </div>
          <hr style={{borderColor: '#444', margin: '15px 0'}}/>
          <div className="bars-container">
            <div className="bar-row"><span className="label">HP</span> <span className="val">{j.hp} / {j.hpMax}</span></div>
            <div className="bar-row"><span className="label">Mana</span> <span className="val">{j.mana} / {j.manaMax}</span></div>
            <div className="bar-row"><span className="label">Stam</span> <span className="val">{j.stam} / {j.stamMax}</span></div>
          </div>
        </div>
      );
    }

    if (item.id === 'argent') {
      const m = playerData.money;
      return (
        <div className="content-panel money-panel">
          <div className="money-section">
            <h3>👛 Porte-monnaie</h3>
            <div className="coins-grid">
              <span className="coin po">{m.wallet.po} PO</span><span className="coin pa">{m.wallet.pa} PA</span>
              <span className="coin pc">{m.wallet.pc} PC</span><span className="coin pp">{m.wallet.pp} PP</span>
            </div>
          </div>
          <div className="money-section" style={{marginTop:'20px', borderTop:'1px solid #444', paddingTop:'10px'}}>
            <h3>🏦 Banque</h3>
            <div className="coins-grid">
              <span className="coin po">{m.bank.po} PO</span><span className="coin pa">{m.bank.pa} PA</span>
              <span className="coin pc">{m.bank.pc} PC</span><span className="coin pp">{m.bank.pp} PP</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="content-panel">
        <h2>{item.icon} {item.label}</h2>
        <p>Session : <strong>{currentSession}</strong></p>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <span>Session: {currentSession}</span>
        <button className="btn-small" onClick={() => setCurrentSession(null)}>Changer</button>
      </div>
      <Carousel items={menuItems} activeIndex={activeIndex} onNavigate={setActiveIndex} />
      <div className="main-content">{renderGameContent()}</div>
    </div>
  );
}

export default App;
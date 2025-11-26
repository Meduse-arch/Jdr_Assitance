import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import "./style.css";

const discordSdk = new DiscordSDK(process.env.CLIENT_ID);

function App() {
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Démarrage...");
  const [sessionList, setSessionList] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1);
  
  // Stocke les données du joueur (joueur + money)
  const [playerData, setPlayerData] = useState(null);

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
          response_type: "code", state: "", prompt: "none", scope: ["identify", "guilds"],
        });
        const response = await fetch("/api/token", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();
        const authData = await discordSdk.commands.authenticate({ access_token });
        setAuth(authData);
        setStatus("Connecté");
        fetchSessions();
      } catch (error) {
        console.error(error);
        setStatus("Erreur (Relance l'activité)");
      }
    }
    setupDiscord();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const list = await res.json();
      setSessionList(list);
    } catch (e) { console.error("Erreur sessions", e); }
  };

  // Récupérer les données du joueur (Appelé quand on change d'onglet ou qu'on rejoint)
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

  // Quand on change d'onglet ou de session, on recharge les données pour être à jour
  useEffect(() => {
    if (currentSession) {
      fetchPlayerData();
    }
  }, [currentSession, activeIndex]); // Se lance aussi quand on change de carte (activeIndex)

  const handleJoinSession = async (sessionId) => {
    setStatus(`Connexion à ${sessionId}...`);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.session_id);
      }
    } catch (e) { setStatus("Erreur serveur"); }
  };

  if (!auth) return <div className="app-container"><h1>🚀 JDR Assistance</h1><p>{status}</p></div>;

  if (!currentSession) {
    return (
      <div className="app-container">
        <h1>Bienvenue, {auth.user.username}</h1>
        <div className="card">
          <h3>Choisir une session</h3>
          {sessionList.length === 0 ? <p>Aucune session disponible.</p> : (
            <div className="session-grid">
              {sessionList.map((sess) => (
                <button key={sess} onClick={() => handleJoinSession(sess)} className="btn-session">
                  Session : <strong>{sess}</strong>
                </button>
              ))}
            </div>
          )}
          <button onClick={fetchSessions} className="btn-link">Actualiser</button>
        </div>
      </div>
    );
  }

  // --- RENDU DU CONTENU DU JEU ---
  const renderGameContent = () => {
    const item = menuItems[activeIndex];

    if (!playerData) return <div className="loading">Chargement des données...</div>;

    // 1. FICHE PERSO
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

    // 2. ARGENT
    if (item.id === 'argent') {
      const m = playerData.money;
      return (
        <div className="content-panel money-panel">
          <div className="money-section">
            <h3>👛 Porte-monnaie</h3>
            <div className="coins-grid">
              <span className="coin po">{m.wallet.po} PO</span>
              <span className="coin pa">{m.wallet.pa} PA</span>
              <span className="coin pc">{m.wallet.pc} PC</span>
              <span className="coin pp">{m.wallet.pp} PP</span>
            </div>
          </div>
          <div className="money-section" style={{marginTop:'20px', borderTop:'1px solid #444', paddingTop:'10px'}}>
            <h3>🏦 Banque</h3>
            <div className="coins-grid">
              <span className="coin po">{m.bank.po} PO</span>
              <span className="coin pa">{m.bank.pa} PA</span>
              <span className="coin pc">{m.bank.pc} PC</span>
              <span className="coin pp">{m.bank.pp} PP</span>
            </div>
          </div>
        </div>
      );
    }

    // 3. OUTILS (Par défaut)
    return (
      <div className="content-panel">
        <h2>{item.icon} {item.label}</h2>
        <p>Session : <strong>{currentSession}</strong></p>
        <p>Utilise le bot pour lancer les dés pour l'instant !</p>
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
import React, { useState, useEffect } from 'react';
import './Hub.css'; // On créera le style juste après

const Hub = ({ auth, guildId, onJoinGame }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la création
  const [newSessionId, setNewSessionId] = useState("");
  const [warningMsg, setWarningMsg] = useState(null);

  // Charger les infos au démarrage
  const fetchInfo = async () => {
    try {
      const res = await fetch("/.proxy/api/hub/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: auth.access_token, 
          guild_id: guildId 
        }),
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
      setSessions(data.sessionList);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleJoin = async (sessionId) => {
    try {
      const res = await fetch("/.proxy/api/hub/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId }),
      });
      if (res.ok) {
        onJoinGame(sessionId); // Lance le jeu
      }
    } catch (e) {
      alert("Erreur connection session");
    }
  };

  const handleCreate = async (force = false) => {
    if (!newSessionId.trim()) return;
    try {
      const res = await fetch("/.proxy/api/hub/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: auth.access_token, 
          guild_id: guildId, 
          session_id: newSessionId, 
          force 
        }),
      });
      const data = await res.json();
      
      if (res.status === 409) {
        setWarningMsg(`La session "${newSessionId}" existe déjà. Écraser ?`);
        return;
      }
      
      if (data.success) {
        setNewSessionId("");
        setWarningMsg(null);
        fetchInfo(); // Rafraichir la liste
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async (sessionId) => {
    if(!confirm(`Supprimer définitivement la session ${sessionId} ?`)) return;
    try {
      const res = await fetch("/.proxy/api/hub/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: auth.access_token, 
          guild_id: guildId, 
          session_id: sessionId 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessionList);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="hub-container">Chargement du Hub...</div>;

  return (
    <div className="hub-container">
      <h1>🌐 Hub des Sessions</h1>
      
      <div className="session-list">
        <h3>Sessions Actives</h3>
        {sessions.length === 0 ? (
          <p>Aucune session en cours.</p>
        ) : (
          sessions.map(id => (
            <div key={id} className="session-item">
              <span>Session: <strong>{id}</strong></span>
              <div className="actions">
                <button className="btn-join" onClick={() => handleJoin(id)}>Rejoindre</button>
                {isAdmin && (
                  <button className="btn-close" onClick={() => handleClose(id)}>X</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <div className="admin-panel">
          <h3>👑 Administration</h3>
          <div className="create-box">
            <input 
              type="text" 
              placeholder="Nom nouvelle session"
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
            />
            <button onClick={() => handleCreate(false)}>Créer Session</button>
          </div>
          {warningMsg && (
            <div className="warning-box">
              <p>⚠️ {warningMsg}</p>
              <button onClick={() => handleCreate(true)}>Oui, écraser et recréer</button>
              <button onClick={() => setWarningMsg(null)}>Annuler</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Hub;
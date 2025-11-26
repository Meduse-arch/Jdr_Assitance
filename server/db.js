import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On pointe vers le fichier DB du bot
const DB_PATH = path.join(__dirname, '../bot/src/db/database.json');

export async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    // Si fichier vide ou inexistant, on renvoie une structure vide
    return { sessions: {}, userSessions: {} };
  }
}

export async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}
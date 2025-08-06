const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const path = require('path');
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const { upload } = require('./mega');

const router = express.Router();

const TARGET_NUMBER = "94773913394";
const IMAGE_PATH = path.join(__dirname, "target.jpg");

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(path.join(__dirname, 'auth_info_baileys'));
}

router.get('/', async (req, res) => {
  let num = req.query.number;

  if (!num) {
    return res.status(400).send("Phone number is required as 'number' query parameter.");
  }

  async function startSession() {
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
    try {
      let socket = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        markOnlineOnConnect: false
      });

      socket.ev.on("creds.update", saveCreds);

      socket.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            startSession();
          }
        } else if (connection === "open") {
          await delay(1000);
          const jid = num.includes("@s.whatsapp.net") ? num : `${num}@s.whatsapp.net`;
          await socket.sendMessage(jid, { image: fs.readFileSync(IMAGE_PATH), caption: "Hi there!" });
          await delay(2000);
          await socket.logout();
        }
      });
    } catch (err) {
      console.error("Error:", err);
    }
  }

  await startSession();
  res.send("QR session started. Scan it from terminal.");
});

module.exports = router;

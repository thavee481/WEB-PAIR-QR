const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const path = require('path');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

let router = express.Router();

router.post('/code', uploadMiddleware.single('imageFile'), async (req, res) => {
    const myNumber = req.body.myNumber?.replace(/[^0-9]/g, '');
    const targetNumber = req.body.targetNumber?.replace(/[^0-9]/g, '');
    const msgText = req.body.msgText || '';
    const imagePath = req.file?.path;

    if (!myNumber || !targetNumber || !msgText || !imagePath) {
        return res.status(400).json({ code: "Missing required fields" });
    }

    // clear previous session
    if (fs.existsSync('./auth_info_baileys')) {
        fs.emptyDirSync('./auth_info_baileys');
    }

    const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
    let sentCode = false;

    try {
        let sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }),
            browser: Browsers.macOS("Safari"),
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            const code = await sock.requestPairingCode(myNumber);
            if (!sentCode) {
                sentCode = true;
                res.json({ code });
            }
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "open") {
                try {
                    await delay(5000);

                    // send image & message
                    await sock.sendMessage(
                        `${targetNumber}@s.whatsapp.net`,
                        { image: fs.readFileSync(imagePath), caption: msgText }
                    );

                    // upload creds to mega
                    const mega_url = await upload(fs.createReadStream('./auth_info_baileys/creds.json'), `${Date.now()}.json`);
                    console.log("Mega session link:", mega_url);

                    fs.unlinkSync(imagePath);
                    await fs.emptyDirSync('./auth_info_baileys');
                } catch (e) {
                    console.error("Send error:", e);
                }
            }

            if (connection === "close") {
                let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === DisconnectReason.restartRequired) {
                    console.log("Restarting connection...");
                    // avoid recursive res.json calls
                    sentCode = true;
                    connectAndSend();
                } else {
                    exec('pm2 restart qasim');
                }
            }
        });

    } catch (err) {
        console.error("Error in pairing:", err);
        if (!sentCode) res.json({ code: "Error generating code" });
    }
});

module.exports = router;

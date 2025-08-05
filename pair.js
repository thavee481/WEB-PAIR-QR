const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const path = require('path');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });

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
    const myNumber = req.body.myNumber.replace(/[^0-9]/g, '');
    const targetNumber = req.body.targetNumber.replace(/[^0-9]/g, '');
    const msgText = req.body.msgText;
    const imagePath = req.file.path;

    async function connectAndSend() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                const code = await sock.requestPairingCode(myNumber);
                if (!res.headersSent) {
                    res.json({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === "open") {
                    try {
                        await delay(5000);
                        await sock.sendMessage(
                            `${targetNumber}@s.whatsapp.net`,
                            { image: fs.readFileSync(imagePath), caption: msgText }
                        );
                        console.log("Message sent to", targetNumber);
                        fs.unlinkSync(imagePath);
                        await fs.emptyDirSync('./auth_info_baileys');
                    } catch (e) {
                        console.log("Send error:", e);
                    }
                }

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    if (reason === DisconnectReason.restartRequired) {
                        connectAndSend().catch(err => console.log(err));
                    } else {
                        exec('pm2 restart qasim');
                    }
                }
            });

        } catch (err) {
            console.log("Error:", err);
            if (!res.headersSent) res.json({ code: "Error generating code" });
        }
    }

    connectAndSend();
});

module.exports = router;

const express = require('express');
const fs = require('fs-extra');
const multer = require('multer');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const router = express.Router();
const uploadMiddleware = multer({ dest: 'uploads/' });

// Clear old auth data
if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync('./auth_info_baileys');
}

router.post('/code', uploadMiddleware.single("image"), async (req, res) => {
    let num = req.body.number;
    let targetNumber = req.body.target;
    let messageText = req.body.message;
    let imagePath = req.file ? req.file.path : null;

    async function connectAndSend() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);

        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (update) => {
                const { connection } = update;

                if (connection === "open") {
                    try {
                        await delay(5000);

                        if (imagePath) {
                            await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, {
                                image: fs.readFileSync(imagePath),
                                caption: messageText
                            });
                        } else {
                            await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageText });
                        }

                        console.log(`Message sent to ${targetNumber}`);
                        fs.emptyDirSync('./auth_info_baileys');
                        if (imagePath) fs.unlinkSync(imagePath);

                    } catch (e) {
                        console.error("Error sending message:", e);
                    }
                }
            });

        } catch (err) {
            console.error("Error in connectAndSend:", err);
            exec('pm2 restart qasim');
            fs.emptyDirSync('./auth_info_baileys');
            if (!res.headersSent) {
                res.send({ code: "Try After Few Minutes" });
            }
        }
    }

    connectAndSend();
});

module.exports = router;

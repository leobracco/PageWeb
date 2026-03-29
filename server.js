const express = require("express");
const path = require("path");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4002;

// Configuración de Vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Bot de Telegram
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

// Conectar Rutas
const productRoutes = require("./routes/productRoutes");
app.use("/", productRoutes);

// Ruta para el envío de formularios por Telegram
app.post("/enviar-mensaje", async (req, res) => {
    const { name, celular, subject, message, "g-recaptcha-response": recaptchaResponse } = req.body;
    
    // 1. SEGURIDAD: Nunca dejes la clave hardcodeada. Asegurate de tenerla en tu archivo .env
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; 

    if (!secretKey) {
        console.error("Falta la RECAPTCHA_SECRET_KEY en las variables de entorno");
        return res.status(500).send("Error de configuración del servidor.");
    }

    try {
        // 2. VERIFICACIÓN: Consultamos a Google
        const recaptchaURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;
        const recaptchaVerification = await axios.post(recaptchaURL);
        
        const { success, score } = recaptchaVerification.data;

        // 3. VALIDACIÓN DE SCORE: Si el puntaje es menor a 0.5, es probable que sea un bot
        // score 1.0 = Muy humano
        // score 0.0 = Muy bot
        if (!success || score < 0.5) {
            console.warn(`Spam bloqueado. Score: ${score}`);
            return res.status(400).send("No se pudo verificar la autenticidad (posible bot).");
        }

        // 4. TELEGRAM SEGURO: Función para evitar que el bot se rompa con caracteres especiales
        // Escapamos los caracteres reservados de Markdown
        const escapeMd = (text) => {
            return text ? text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&') : '';
        };

        const telegramMessage = `🚜 *Nuevo Mensaje de Contacto*\n\n` +
                                `👤 *Nombre:* ${escapeMd(name)}\n` +
                                `📞 *Celular:* ${escapeMd(celular)}\n` +
                                `📌 *Asunto:* ${escapeMd(subject)}\n` +
                                `📝 *Mensaje:* ${escapeMd(message)}`;

        // Enviamos a Telegram
        await bot.sendMessage(chatId, telegramMessage, { parse_mode: "MarkdownV2" });

        res.status(200).send("¡Mensaje enviado correctamente!");

    } catch (error) {
        console.error("Error en el servidor / Telegram:", error);
        // Es importante no dar detalles del error al usuario final por seguridad
        res.status(500).send("Hubo un error al procesar tu solicitud. Intentá de nuevo.");
    }
});

app.use((req, res, next) => {
    // Establecemos el código de estado HTTP 404 (importante para SEO)
    res.status(404);

    // Renderizamos la vista que creamos
    res.render('404', {
        // Puedes pasar variables si tu template las usa (opcional)
        titulo: 'Página no encontrada | Agro Parallel'
    });
});
app.use((err, req, res, next) => {
    // 1. Registrar el error en la consola para que tú (el desarrollador) sepas qué pasó
    console.error("🔥 ERROR CRÍTICO DEL SERVIDOR:");
    console.error(err.stack);

    // 2. Si el error tiene código (ej. base de datos), úsalo, si no, usa 500
    const statusCode = err.status || 500;

    // 3. Renderizar la vista del tractor roto
    res.status(statusCode).render('500', {
        error: process.env.NODE_ENV === 'development' ? err : {} // Solo mostrar detalles técnicos si estás en modo desarrollo
    });
});
app.listen(PORT, () => console.log(`Servidor Agro Parallel corriendo en http://localhost:${PORT}`));
const nodemailer = require("nodemailer");

// Fonction pour envoyer un e-mail
const sendEmail = async (email, subject, text) => {
    try {
        // Configuration du transporteur avec les paramètres de votre service d'e-mail
        const transporter = nodemailer.createTransport({
            host: process.env.HOST,       // Exemple : "smtp.gmail.com"
            service: process.env.SERVICE, // Exemple : "gmail"
            port: 587,
            secure: false, // true pour 465, false pour les autres ports
            auth: {
                user: process.env.USER, // Adresse e-mail
                pass: process.env.PASS  // Mot de passe de l'e-mail
            },
        });

        // Envoi de l’e-mail
        await transporter.sendMail({
            from: process.env.USER,
            to: email,
            subject: subject,
            text: text,
        });

        console.log("E-mail envoyé avec succès !");
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
    }
};

module.exports = sendEmail;

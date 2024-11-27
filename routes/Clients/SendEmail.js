const nodemailer = require("nodemailer");
require('dotenv').config();

// Fonction pour envoyer un e-mail avec SendGrid
const sendEmail = async (email, subject, text) => {
  try {
    // Configuration du transporteur avec SendGrid
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey", 
        pass: process.env.SENDGRID_API_KEY, 
      },
    });

    // Envoi de l’e-mail
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL, // Adresse e-mail d'envoi
      to: email,
      subject: subject,
      text: text,
    });

    console.log("E-mail envoyé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail :", error);
    throw new Error("Erreur d'envoi d'email"); // Rejeter pour le catcher
  }
};

// Fonction pour envoyer un e-mail avec SendGrid
const sendgridEmail = async (email, subject, text) => {
    try {

        // using Twilio SendGrid's v3 Node.js Library
        // https://github.com/sendgrid/sendgrid-nodejs

        const sgMail = require('@sendgrid/mail')
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const msg = {
        to: email, // Change to your recipient
        from: 'wnsansglutten@gmail.com', // Change to your verified sender
        subject: subject,
        text: text,
        html: '<strong>' + text + '</strong>',
        }
        sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        })
  
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'e-mail :", error);
      throw new Error("Erreur d'envoi d'email"); // Rejeter pour le catcher
    }
  };

module.exports = sendgridEmail;

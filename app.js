const express = require("express");
const app = express();
const userRoutes = require("./routes/Clients/index");
const offreRoutes = require("./routes/Offres/index");
const produitRoutes = require("./routes/Product/index");


const cors = require('cors');


app.use(cors({
    origin: '*',
    methods: ['GET', 'POST','DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Pour les images spécifiquement
app.use('/wp-content/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Middleware pour analyser les données JSON dans les requêtes
app.use(express.json());

// Enregistrer les routes sous /user
app.use("/Clients", userRoutes);
app.use("/Offres", offreRoutes);
app.use("/Product", produitRoutes);
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
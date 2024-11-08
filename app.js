const express = require("express");
const app = express();
const userRoutes = require("./routes/Clients/index");
const offreRoutes = require("./routes/Offres/index");
const produitRoutes = require("./routes/Product/index");

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
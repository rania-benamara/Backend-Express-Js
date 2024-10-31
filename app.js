const express = require("express");
const app = express();
const userRoutes = require("./routes/Clients/index");

// Middleware pour analyser les données JSON dans les requêtes
app.use(express.json());

// Enregistrer les routes sous /user
app.use("/Clients", userRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = "cle"; 

// Middleware pour vérifier le JWTe
const authenticateJWT = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) {
        jwt.verify(token, secretKey, (err, decoded) => {
          if (err) {
            return res.status(403).json({ message: "Forbidden" });
          }
          req.user = decoded;
          next();
        });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
  /***********************************register************************************/
  //verifier si un compte existe deja 
  router.post("/register", (req, res) => {
    const {prenom, nom, email, telephone, password ,date_naissance} = req.body;
  
    // Vérification des champs obligatoires
    if ( !prenom || !nom || !email || !telephone|| !password|| !date_naissance) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    // Vérifier si l'email existe déjà dans la base de données
    const checkEmail = "SELECT * FROM uzr4ephf_arsam_user WHERE email = ?";
    db.query(checkEmail, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Error checking email" });
        }

        // Si l'email existe déjà
        if (results.length > 0) {
            return res.status(400).json({ message: "L'email existe déjà, veuillez vous connecter." });
        }

        // Hashage du mot de passe
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ message: "Error hashing password" });

            const sql = "INSERT INTO uzr4ephf_arsam_user (prenom, nom, email, telephone, password ,date_naissance) VALUES (?, ?, ?, ?, ?, ?)";
            db.query(sql, [prenom, nom, email, telephone, hashedPassword ,date_naissance], (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ message: "Error registering user" });
                }
                res.status(201).json({
                    message: "Utilisateur enregistré avec succès",
                    userId: result.insertId,
                });
            });
        });
    });
});

  /****************************Fonction login*******************************/
  router.post("/login", (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: "Veuillez remplir les deux champs " });
    }
  
    const sql = "SELECT * FROM uzr4ephf_arsam_user WHERE email = ?";
    db.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }
  
      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
  
      const user = results[0];
  
      // Comparer le mot de passe
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.status(500).json({ message: "Error comparing passwords" });
        }
  
        if (!isMatch) {
          return res.status(401).json({ message: "Email ou mot de passe invalide" });
        }
  
        // Générer un token JWT
        const token = jwt.sign({ userId: user._arsam_user_id, email: user.email }, secretKey/*, { expiresIn: "1h" }*/);
  
        res.status(200).json({ message: "Login successful", token });
      });
    });
  });

  /*************************changer mot de passe par utilisateur ******************/
  router.put('/change-password', authenticateJWT, (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;
  
    // Vérification des champs obligatoires
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "veuillez remplir tous les champs" });
    }
  
    // Vérification que les nouveaux mots de passe correspondent
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "les mots de passe sont differents" });
    }
  
    // Hasher le nouveau mot de passe
    bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
      if (err) return res.status(500).json({ message: "Error hashing new password" });
  
      // Mettre à jour le mot de passe dans la base de données
      const sqlUpdate = "UPDATE uzr4ephf_arsam_user SET password = ? WHERE _arsam_user_id = ?";
      db.query(sqlUpdate, [newHashedPassword, userId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Erreur" });
        }
        if (result.affectedRows > 0) {
          res.status(200).json({ message: "Mot de passe changer" });
        }
      });
    });
  });

  /*******************************Ajouter adresse specifique par utilisateur*********************************** */
  router.post("/add-address", authenticateJWT, (req, res) => {
    const { numero_appartement, rue, ville, province, code_postal } = req.body;
    const userId = req.user.userId;
    const postal = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/; // format A1A 1A1
    if (!numero_appartement || !rue || !ville || !province || !code_postal) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    if (!postal.test(code_postal)) {
        return res.status(400).json({ message: "Le code postal doit être au format A1A 1A1" });
    }
    const sql = "INSERT INTO uzr4ephf_arsam_user_adress (numero_appartement, rue, ville, province, code_postal, _arsam_user_id) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [numero_appartement, rue, ville, province, code_postal, userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur lors de l'ajout de l'adresse" });
        }
        res.status(201).json({ message: "Adresse ajoutée avec succès"});
    });
});

/*********************************Modifier adresse specifique par utilisateur ********************************** */
router.put("/update-address/:id", authenticateJWT, (req, res) => {
    const { numero_appartement, rue, ville, province, code_postal } = req.body;
    const addressId = req.params.id;
    const postal = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/; 
    // Vérification des champs obligatoires
    if (!numero_appartement || !rue || !ville || !province || !code_postal) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }
    if (!postal.test(code_postal)) {
        return res.status(400).json({ message: "Le code postal doit être au format A1A 1A1" });
    }

    // Mettre à jour l'adresse dans la base de données
    const sqlUpdate = "UPDATE uzr4ephf_arsam_user_adress SET numero_appartement = ?, rue = ?, ville = ?, province = ?, code_postal = ? WHERE id = ?";
    db.query(sqlUpdate, [numero_appartement, rue, ville, province, code_postal, addressId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Error updating address" });
        }
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Adresse mise à jour avec succès" });
        }
    });
});

/************************************Supprimer adresse specifique par utilisateur ****************************** */
router.delete("/delete-address/:id", authenticateJWT, (req, res) => {
    const addressId = req.params.id;
    const sql = "DELETE FROM uzr4ephf_arsam_user_adress WHERE id = ?";
    db.query(sql, [addressId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur lors de la suppression de l'adresse" });
        }
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Adresse supprimée avec succès" });
        } else {
            res.status(404).json({ message: "Adresse non trouvée" });
        }
    });
});

/****************************************supprimer le compte dun utilisateur ********************************** */
router.delete("/delete-user", authenticateJWT, (req, res) => {
    const userId = req.user.userId;  // ID de l'utilisateur récupéré du token

    const sqlDeleteUser = "DELETE FROM uzr4ephf_arsam_user WHERE _arsam_user_id = ?";

    // Supprimer l'utilisateur (les adresses seront supprimées automatiquement grâce à la contrainte ON DELETE CASCADE)
    db.query(sqlDeleteUser, [userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur lors de la suppression de l'utilisateur." });
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Compte supprimé avec succès." });
        } else {
            res.status(404).json({ message: "Utilisateur non trouvé." });
        }
    });
});
/*********************************Récupérer toutes les adresses d'un client**********************************/
router.get("/address", authenticateJWT, (req, res) => {
  const userId = req.user.userId;  // ID de l'utilisateur récupéré du token

  const sql = `
      SELECT id, numero_appartement, rue, ville, province, code_postal
      FROM uzr4ephf_arsam_user_adress
      WHERE _arsam_user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Erreur lors de la récupération des adresses." });
      }
      
      // Si aucune adresse n'est trouvée pour l'utilisateur
      if (results.length === 0) {
          return res.status(404).json({ message: "Aucune adresse trouvée pour cet utilisateur." });
      }
      
      res.status(200).json({ addresses: results });
  });
});
/*******************************se deconnecter***************** */
router.post("/logout", authenticateJWT, (req, res) => {
  // Aucune action n'est nécessaire côté serveur pour le JWT, mais on informe le client.
  res.status(200).json({ message: "Déconnecté avec succès" });
});

/************************* Mot de passe oublié ***************************/
// Vérification de l'adresse e-mail pour la réinitialisation du mot de passe
router.post("/forgot-password", (req, res) => {
   const { email } = req.body;

  const sqlCheckEmail = "SELECT _arsam_user_id FROM uzr4ephf_arsam_user WHERE email = ?";
  db.query(sqlCheckEmail, [email], (err, results) => {
      if (err) {
          console.error("Erreur de base de données:", err);
          return res.status(500).json({ message: "Erreur lors de la vérification de l'email." });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "Email non trouvé." });
      }

      // On envoie l'ID utilisateur pour la suite du processus
      res.status(200).json({ message: "Email vérifié avec succès.", userId: results[0]._arsam_user_id });
  });
});

/************************************resert le mot de passe *************************************** */
router.put("/reset-password", (req, res) => {
  const { userId, newPassword, confirmPassword } = req.body;

  // Vérification des champs
  if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs." });
  }
  if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
  }

  // Hashage du nouveau mot de passe
  bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
          console.error("Erreur lors du hachage du mot de passe:", err);
          return res.status(500).json({ message: "Erreur serveur" });
      }

      // Mise à jour du mot de passe dans la base de données
      const sqlUpdatePassword = "UPDATE uzr4ephf_arsam_user SET password = ? WHERE _arsam_user_id = ?";
      db.query(sqlUpdatePassword, [hashedPassword, userId], (err, result) => {
          if (err) {
              console.error("Erreur de base de données:", err);
              return res.status(500).json({ message: "Erreur lors de la réinitialisation du mot de passe" });
          }
          if (result.affectedRows > 0) {
              res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
          } else {
              res.status(404).json({ message: "Utilisateur non trouvé." });
          }
      });
  });
});

  module.exports = router;

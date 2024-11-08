const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = "cle"; 

// Middleware pour vérifier le JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log('Received auth header:', authHeader);

  if (authHeader) {
      const token = authHeader.split(" ")[1];
      console.log('Extracted token:', token);

      if (token) {
          jwt.verify(token, secretKey, (err, decoded) => {
              if (err) {
                  console.error('Token verification error:', err);
                  return res.status(403).json({ message: "Forbidden" });
              }
              console.log('Decoded token:', decoded);
              req.user = decoded;
              next();
          });
      } else {
          console.log('No token in auth header');
          res.status(401).json({ message: "Unauthorized" });
      }
  } else {
      console.log('No auth header present');
      res.status(401).json({ message: "Unauthorized" });
  }
};
  /***********************************register************************************/
  //verifier si un compte existe deja 
  router.post("/register", (req, res) => {
    const { nom, prenom, telephone, email, password, date_naissance } = req.body;
  
    // Vérification des champs obligatoires
    if (!prenom || !nom || !telephone ||  !email || !password|| !date_naissance) {
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

            const sql = "INSERT INTO uzr4ephf_arsam_user (nom, prenom, telephone, email, password, date_naissance) VALUES (?, ?, ?, ?, ?, ?)";
            db.query(sql, [nom, prenom, telephone, email, hashedPassword, date_naissance], (err, result) => {
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
    console.log('Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ message: "Veuillez remplir les deux champs" });
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
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ message: "Error comparing passwords" });
            }

            if (!isMatch) {
                return res.status(401).json({ message: "Email ou mot de passe invalide" });
            }

            const tokenPayload = { 
                userId: user._arsam_user_id, 
                email: user.email 
            };
            console.log('Token payload:', tokenPayload);

            const token = jwt.sign(tokenPayload, secretKey);
            console.log('Generated token:', token);

            res.status(200).json({ 
                message: "Login successful", 
                token,
                userId: user._arsam_user_id 
            });
        });
    });
});

  /*************************changer mot de passe ******************/
  router.put('/change-password', authenticateJWT, (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    // Vérification des champs obligatoires
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    // Vérification que les nouveaux mots de passe correspondent
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Les nouveaux mots de passe sont différents" });
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    if (currentPassword === newPassword) {
        return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
    }

    // Récupérer le mot de passe actuel de l'utilisateur
    const sqlSelect = "SELECT password FROM uzr4ephf_arsam_user WHERE _arsam_user_id = ?";
    db.query(sqlSelect, [userId], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur de base de données" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const currentHashedPassword = results[0].password;

        // Vérifier que le mot de passe actuel est correct
        bcrypt.compare(currentPassword, currentHashedPassword, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ message: "Erreur lors de la vérification du mot de passe" });
            }

            if (!isMatch) {
                return res.status(400).json({ message: "Le mot de passe actuel est incorrect" });
            }

            // Hasher le nouveau mot de passe
            bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    return res.status(500).json({ message: "Erreur lors du hashage du mot de passe" });
                }

                // Mettre à jour le mot de passe dans la base de données
                const sqlUpdate = "UPDATE uzr4ephf_arsam_user SET password = ? WHERE _arsam_user_id = ?";
                db.query(sqlUpdate, [newHashedPassword, userId], (err, result) => {
                    if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({ message: "Erreur lors de la mise à jour du mot de passe" });
                    }

                    if (result.affectedRows > 0) {
                        res.status(200).json({ message: "Mot de passe modifié avec succès" });
                    } else {
                        res.status(404).json({ message: "Utilisateur non trouvé" });
                    }
                });
            });
        });
    });
});

  /*******************************Ajouter adresse*********************************** */
  router.post("/add-address", authenticateJWT, (req, res) => {
    console.log('Add address request received');
    console.log('User from token:', req.user);
    console.log('Request body:', req.body);

    const { numero_appartement, rue, ville, province, code_postal } = req.body;
    const userId = req.user.userId;

    console.log('Using userId:', userId);

    const postal = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/;
    
    if (!numero_appartement || !rue || !ville || !province || !code_postal) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    if (!postal.test(code_postal)) {
        return res.status(400).json({ message: "Le code postal doit être au format A1A 1A1" });
    }

    const sql = "INSERT INTO uzr4ephf_arsam_user_adress (numero_appartement, rue, ville, province, code_postal, arsam_user_id) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [numero_appartement, rue, ville, province, code_postal, userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur lors de l'ajout de l'adresse" });
        }
        
        console.log('Address added successfully. Result:', result);
        res.status(201).json({ 
            message: "Adresse ajoutée avec succès",
            addressId: result.insertId,
            userId: userId
        });
    });
});


/*********************************Modifier adresse ********************************** */
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

/************************************Supprimer adresse****************************** */
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

/****************************************supprimer utilisateur********************************** */
// Route pour supprimer un compte utilisateur
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

  module.exports = router;
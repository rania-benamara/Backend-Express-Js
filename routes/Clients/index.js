const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = "cle"; 
const sendEmail = require("./SendEmail");

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

/**************************************mot de pasee oublie avec envoie du code a 6 chiffre********************************************************* */
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

     const userId = results[0]._arsam_user_id;

     // Générez un code de vérification à 6 chiffres
     const verificationCode = Math.floor(100000 + Math.random() * 900000);
     const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // Expire dans 10 minutes

     // Insérez le code dans la table de vérification
     const sqlInsertCode = "INSERT INTO uzr4ephf_arsam_verification_codes (_arsam_user_id, verification_code, expiration_time) VALUES (?, ?, ?)";
     db.query(sqlInsertCode, [userId, verificationCode, expirationTime], async (err) => {
         if (err) {
             console.error("Erreur lors de la génération du code :", err);
             return res.status(500).json({ message: "Erreur lors de la génération du code de vérification." });
         }

         // Envoi de l'e-mail de vérification
         try {
             await sendEmail(email, "Code de vérification", `Votre code de vérification est : ${verificationCode}`);
             res.status(200).json({ message: "Code de vérification envoyé par e-mail." });
         } catch (emailError) {
             console.error("Erreur lors de l'envoi de l'e-mail :", emailError);
             res.status(500).json({ message: "Erreur lors de l'envoi de l'e-mail de vérification." });
         }
     });
  });
});

/**************************************************verification du code *************************************************************** */
router.post("/verify-code", (req, res) => {
  const { verificationCode } = req.body;  // On ne récupère que le code

  // Recherche du code dans la base de données
  const sqlVerifyCode = "SELECT _arsam_user_id, expiration_time FROM uzr4ephf_arsam_verification_codes WHERE verification_code = ? AND expiration_time > CURRENT_TIMESTAMP";

  db.query(sqlVerifyCode, [verificationCode], (err, codeResults) => {
      if (err || codeResults.length === 0) {
          console.error("Erreur de base de données :", err);
          return res.status(400).json({ message: "Code de vérification invalide ou expiré." });
      }

      // Si le code est valide, renvoyer un message de succès
      const userId = codeResults[0]._arsam_user_id;
        // Créer un token JWT avec l'ID de l'utilisateur
        const token = jwt.sign({ userId }, secretKey, { expiresIn: "1h" });

    // Réponse avec le token
    res.status(200).json({message: "Code de vérification validé avec succès.",token});
  });
});


/************************************************** réinitialisation du mot de passe *************************************************************** */
router.post("/reset-password", authenticateJWT , (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  // Récupérer l'ID utilisateur depuis l'objet `req` (déjà défini par le middleware)
  const userId = req.user.userId;

  // Vérification des mots de passe
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
  }

  // Hash du mot de passe
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  // Mettre à jour le mot de passe dans la base de données
  const sqlUpdatePassword = "UPDATE uzr4ephf_arsam_user SET password = ? WHERE _arsam_user_id = ?";
  db.query(sqlUpdatePassword, [hashedPassword, userId], (err) => {
    if (err) {
      console.error("Erreur lors de la mise à jour du mot de passe :", err);
      return res.status(500).json({ message: "Erreur lors de la mise à jour du mot de passe." });
    }

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  });
});


// **************************** passer une Commande personnalisée ******************************
router.post("/personalized-order", authenticateJWT, (req, res) => {
  const { description, date, telephone } = req.body;
  const userId = req.user.userId;  // Récupéré à partir du token JWT

  // Vérifier que tous les champs sont remplis
  if (!description || !date || !telephone) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
  }

  const sql = "INSERT INTO uzr4ephf_arsam_personalized_orders (_arsam_user_id, description, date, telephone) VALUES (?, ?, ?, ?)";

  db.query(sql, [userId, description, date, telephone], (err, result) => {
      if (err) {
          console.error("Erreur de base de données:", err);
          return res.status(500).json({ message: "Erreur lors de la création de la commande personnalisée." });
      }
      res.status(201).json({ message: "Commande personnalisée ajoutée avec succès", orderId: result.insertId });
  });
});
/*************************************recuperer les commande personnalise passe par un client specifique ********** */
router.get("/p-order", authenticateJWT, (req, res) => {
  const userId = req.user.userId;  // Récupéré à partir du token JWT

  const sql = `
      SELECT order_id, _arsam_user_id, description, date, telephone
      FROM uzr4ephf_arsam_personalized_orders
      WHERE _arsam_user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error("Erreur de base de données:", err);
          return res.status(500).json({ message: "Erreur lors de la récupération des commandes personnalisées." });
      }
      
      // Si aucune commande n'est trouvée pour l'utilisateur
      if (results.length === 0) {
          return res.status(404).json({ message: "Aucune commande personnalisée trouvée." });
      }

      res.status(200).json({ personalizedOrders: results });
  });
});

/*************************************** Ajouter un produit aux favoris *******************************************************/
router.post('/add-favoris', authenticateJWT, (req, res) => {
  const userId = req.user.userId;  // Récupérer l'ID de l'utilisateur du token
  const { productId } = req.body;  // Récupérer l'ID du produit depuis le corps de la requête

  // Vérification que l'ID du produit existe
  if (!productId) {
    return res.status(400).json({ message: "ID du produit manquant." });
  }

  // Vérification si le produit est déjà ajouté aux favoris de l'utilisateur
  const checkQuery = "SELECT 1 FROM uzr4ephf_arsam_user_favoris WHERE _arsam_user_id = ? AND product_id = ?";

  db.query(checkQuery, [userId, productId], (err, results) => {
    if (err) {
      console.error("Erreur de base de données lors de la vérification des favoris:", err);
      return res.status(500).json({ message: "Erreur lors de la vérification des favoris." });
    }

    if (results.length > 0) {
      // Le produit est déjà dans les favoris
      return res.status(400).json({ message: "Ce produit est déjà dans vos favoris." });
    }

    // Si le produit n'est pas encore dans les favoris, l'ajouter
    const sql = `
      INSERT INTO uzr4ephf_arsam_user_favoris (_arsam_user_id, product_id)
      VALUES (?, ?)
    `;

    db.query(sql, [userId, productId], (err, results) => {
      if (err) {
        console.error("Erreur de base de données lors de l'ajout aux favoris:", err);
        return res.status(500).json({ message: "Erreur lors de l'ajout aux favoris." });
      }

      // Répondre avec un message de succès
      res.status(200).json({ message: "Produit ajouté aux favoris avec succès." });
    });
  });
});

/***************************************récupérer les produits favoris de l'utilisateur******************** */
router.get('/favoris', authenticateJWT, (req, res) => {
    const userId = req.user.userId;  // Récupérer l'ID de l'utilisateur du token

    // Requête SQL pour récupérer uniquement les produits ajoutés aux favoris
    const query = `
        SELECT uzr4ephf_posts.ID as id, 
               uzr4ephf_posts.post_title as name, 
               uzr4ephf_postmeta.meta_value as price,
               uzr4ephf_posts.guid as image
        FROM uzr4ephf_posts
        JOIN uzr4ephf_arsam_user_favoris ON uzr4ephf_arsam_user_favoris.product_id = uzr4ephf_posts.ID
        LEFT JOIN uzr4ephf_postmeta ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id AND uzr4ephf_postmeta.meta_key = "_price"
        WHERE uzr4ephf_arsam_user_favoris._arsam_user_id = ?
        AND uzr4ephf_posts.post_type = "product"
        AND uzr4ephf_posts.post_status = "publish";
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des produits favoris:', err);
            return res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits favoris' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun produit favori trouvé.' });
        }

        res.json(results); // Retourner les produits favoris trouvés
    });
});

  module.exports = router;
  

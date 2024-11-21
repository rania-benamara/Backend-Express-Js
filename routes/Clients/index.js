const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = "cle"; 
const sendEmail = require("./SendEmail");
const globalState = { userId: null };

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

/************************************************** Mot de passe oublié - Envoi du code**************************************************/
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

    // Stocker l'ID utilisateur
    globalState.userId = results[0]._arsam_user_id;

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);

    const sqlInsertCode = `
      INSERT INTO uzr4ephf_arsam_verification_codes (_arsam_user_id, verification_code, expiration_time) 
      VALUES (?, ?, ?)
    `;
    db.query(sqlInsertCode, [globalState.userId, verificationCode, expirationTime], async (err) => {
      if (err) {
        console.error("Erreur lors de la génération du code :", err);
        return res.status(500).json({ message: "Erreur lors de la génération du code." });
      }

      try {
        await sendEmail(email, "Code de vérification", `Votre code est : ${verificationCode}`);
        res.status(200).json({ message: "Code envoyé par e-mail." });
      } catch (emailError) {
        console.error("Erreur d'envoi de l'email :", emailError);
        res.status(500).json({ message: "Erreur lors de l'envoi de l'e-mail." });
      }
    });
  });
});

/**************************************************Vérification du code **************************************************/
router.post("/verify-code", (req, res) => {
  const { verificationCode } = req.body;

  const sqlVerifyCode = `
    SELECT _arsam_user_id, expiration_time 
    FROM uzr4ephf_arsam_verification_codes 
    WHERE verification_code = ? AND expiration_time > CURRENT_TIMESTAMP
  `;
  db.query(sqlVerifyCode, [verificationCode], (err, codeResults) => {
    if (err || codeResults.length === 0) {
      console.error("Erreur de vérification :", err);
      return res.status(400).json({ message: "Code invalide ou expiré." });
    }

    const userId = codeResults[0]._arsam_user_id;
    if (userId !== globalState.userId) {
      return res.status(403).json({ message: "Utilisateur non valide." });
    }

    res.status(200).json({ message: "Code validé." });
  });
});

/**************************************************Réinitialisation du mot de passe**************************************************/
router.post("/reset-password", (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  if (!globalState.userId) {
    return res.status(403).json({ message: "Processus expiré. Veuillez recommencer." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const sqlUpdatePassword = `
    UPDATE uzr4ephf_arsam_user 
    SET password = ? 
    WHERE _arsam_user_id = ?
  `;
  db.query(sqlUpdatePassword, [hashedPassword, globalState.userId], (err) => {
    if (err) {
      console.error("Erreur de mise à jour :", err);
      return res.status(500).json({ message: "Erreur de mise à jour du mot de passe." });
    }

    globalState.userId = null; // Réinitialiser après succès
    res.status(200).json({ message: "Mot de passe mis à jour." });
  });
});
// route pour recuperer le produit et lajouter dans la table panier
router.post("/ajouter-au-panier", authenticateJWT, (req, res) => {
  const { product_id } = req.body;
  const userId = req.user.userId;  // Récupère l'ID de l'utilisateur à partir du token JWT

  if (!product_id) {
      return res.status(400).json({ message: "Le product_id est requis !" });
  }

  // Définir une quantité par défaut de 1 si non spécifiée
  const quantity = 1;

  // Requête SQL pour insérer le produit dans le panier
  const sql = `
      INSERT INTO uzr4ephf_panier (user_id, product_id, quantity)
      VALUES (?, ?, ?)
  `;

  db.query(sql, [userId, product_id, quantity], (err, result) => {
      if (err) {
          console.error("Erreur lors de l'ajout au panier:", err);
          return res.status(500).json({ message: "Erreur interne du serveur." });
      }

      res.status(201).json({ message: "Produit ajouté au panier avec succès." });
  });
});

/**********************************route pour recuperer les produit dans la table panier eyt les afficher dans la page panier*/

router.get("/panier", authenticateJWT, (req, res) => {
  const userId = req.user.userId;  // Récupère l'ID de l'utilisateur à partir du token JWT

  // Requête SQL pour récupérer les produits du panier avec détails complets
  const sql = `
      SELECT
          p.ID as id,
          p.post_title as name,
          pm_price.meta_value as price,
          (SELECT pm2.meta_value
              FROM uzr4ephf_postmeta pm2
              WHERE pm2.post_id = p.ID
              AND pm2.meta_key = '_thumbnail_id') as thumbnail_id,
          (SELECT p2.guid
              FROM uzr4ephf_posts p2
              WHERE p2.ID = (
                  SELECT pm3.meta_value
                  FROM uzr4ephf_postmeta pm3
                  WHERE pm3.post_id = p.ID
                  AND pm3.meta_key = '_thumbnail_id'
              )
          ) as image_url,
          GROUP_CONCAT(DISTINCT terms.name) as categories,
          p.post_content as description,
          pc.quantity
      FROM uzr4ephf_panier pc
      JOIN uzr4ephf_posts p ON pc.product_id = p.ID
      LEFT JOIN uzr4ephf_postmeta pm_price
          ON p.ID = pm_price.post_id
          AND pm_price.meta_key = '_price'
      LEFT JOIN uzr4ephf_term_relationships tr
          ON p.ID = tr.object_id
      LEFT JOIN uzr4ephf_term_taxonomy tt
          ON tr.term_taxonomy_id = tt.term_taxonomy_id
      LEFT JOIN uzr4ephf_terms terms
          ON tt.term_id = terms.term_id
      WHERE pc.user_id = ?
      AND p.post_type = 'product'
      AND p.post_status = 'publish'
      GROUP BY p.ID;
  `;

  db.query(sql, [userId], (err, results) => {
      if (err) {
          console.error("Erreur lors de la récupération des produits du panier:", err);
          return res.status(500).json({ message: "Erreur interne du serveur." });
      }

      // Si aucun produit trouvé
      if (results.length === 0) {
          return res.status(404).json({ message: "Aucun produit trouvé dans le panier." });
      }

      // Retourne les produits dans le panier avec tous les détails
      res.status(200).json(results);
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
  

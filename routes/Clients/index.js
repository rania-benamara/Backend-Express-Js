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

// Register Route
router.post("/register", (req, res) => {
    const { nom, prenom, telephone, email, password, date_naissance } = req.body;

    if (!prenom || !nom || !telephone || !email || !password || !date_naissance) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    const checkEmail = "SELECT * FROM uzr4ephf_arsam_user WHERE email = ?";
    db.query(checkEmail, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Error checking email" });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "L'email existe déjà, veuillez vous connecter." });
        }

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

// Login Route
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

// Change Password Route
router.put('/change-password', authenticateJWT, (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Les nouveaux mots de passe sont différents" });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien" });
    }

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

        bcrypt.compare(currentPassword, currentHashedPassword, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ message: "Erreur lors de la vérification du mot de passe" });
            }

            if (!isMatch) {
                return res.status(400).json({ message: "Le mot de passe actuel est incorrect" });
            }

            bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    return res.status(500).json({ message: "Erreur lors du hashage du mot de passe" });
                }

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

// Add Address Route
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

    const sql = "INSERT INTO uzr4ephf_arsam_user_adress (numero_appartement, rue, ville, province, code_postal, _arsam_user_id) VALUES (?, ?, ?, ?, ?, ?)";
    
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

// Update Address Route
router.put("/update-address/:id", authenticateJWT, (req, res) => {
    const { numero_appartement, rue, ville, province, code_postal } = req.body;
    const addressId = req.params.id;
    const postal = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/;

    if (!numero_appartement || !rue || !ville || !province || !code_postal) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    if (!postal.test(code_postal)) {
        return res.status(400).json({ message: "Le code postal doit être au format A1A 1A1" });
    }

    const sqlUpdate = "UPDATE uzr4ephf_arsam_user_adress SET numero_appartement = ?, rue = ?, ville = ?, province = ?, code_postal = ? WHERE id = ? AND _arsam_user_id = ?";
    db.query(sqlUpdate, [numero_appartement, rue, ville, province, code_postal, addressId, req.user.userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Error updating address" });
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Adresse mise à jour avec succès" });
        } else {
            res.status(404).json({ message: "Adresse non trouvée ou non autorisée" });
        }
    });
});

// Delete Address Route
router.delete("/delete-address/:id", authenticateJWT, (req, res) => {
    const addressId = req.params.id;
    const sql = "DELETE FROM uzr4ephf_arsam_user_adress WHERE id = ? AND _arsam_user_id = ?";
    
    db.query(sql, [addressId, req.user.userId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Erreur lors de la suppression de l'adresse" });
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Adresse supprimée avec succès" });
        } else {
            res.status(404).json({ message: "Adresse non trouvée ou non autorisée" });
        }
    });
});

// Delete User Account Route
router.delete("/delete-user", authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const sqlDeleteUser = "DELETE FROM uzr4ephf_arsam_user WHERE _arsam_user_id = ?";

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

// Get User Addresses Route
router.get("/address", authenticateJWT, (req, res) => {
    const userId = req.user.userId;

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

        if (results.length === 0) {
            return res.status(404).json({ message: "Aucune adresse trouvée pour cet utilisateur." });
        }

        res.status(200).json({ addresses: results });
    });
});

// Logout Route
router.post("/logout", authenticateJWT, (req, res) => {
    res.status(200).json({ message: "Déconnecté avec succès" });
});

// Forgot Password Route
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

        res.status(200).json({ 
            message: "Email vérifié avec succès.", 
            userId: results[0]._arsam_user_id 
        });
    });
});

// Reset Password Route
router.put("/reset-password", (req, res) => {
    const { userId, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs." });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }

    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Erreur lors du hachage du mot de passe:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

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

// Add Personalized Order Route
router.post("/personalized-order", authenticateJWT, (req, res) => {
    const { description, date, telephone } = req.body;
    const userId = req.user.userId;

    if (!description || !date || !telephone) {
        return res.status(400).json({ message: "Veuillez remplir tous les champs!" });
    }

    const sql = `
        INSERT INTO uzr4ephf_arsam_personalized_orders 
        (_arsam_user_id, description, date, telephone)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [userId, description, date, telephone], (err, result) => {
        if (err) {
            console.error("Erreur de base de données:", err);
            return res.status(500).json({ message: "Erreur lors de la création de la commande personnalisée." });
        }

        res.status(201).json({ 
            message: "Commande personnalisée ajoutée avec succès", 
            orderId: result.insertId 
        });
    });
});

// Get Personalized Orders Route
router.get("/p-order", authenticateJWT, (req, res) => {
    const userId = req.user.userId;

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

        if (results.length === 0) {
            return res.status(404).json({ message: "Aucune commande personnalisée trouvée." });
        }

        res.status(200).json({ personalizedOrders: results });
    });
});

// Add to Favorites Route
router.post('/add-favoris', authenticateJWT, (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
        return res.status(400).json({ message: "ID du produit manquant." });
    }

    const checkQuery = `
        SELECT 1 FROM uzr4ephf_arsam_user_favoris
        WHERE _arsam_user_id = ? AND product_id = ?
    `;

    db.query(checkQuery, [userId, productId], (err, results) => {
        if (err) {
            console.error("Erreur de base de données lors de la vérification des favoris:", err);
            return res.status(500).json({ message: "Erreur lors de la vérification des favoris." });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: "Ce produit est déjà dans vos favoris." });
        }

        const sql = `
            INSERT INTO uzr4ephf_arsam_user_favoris 
            (_arsam_user_id, product_id)
            VALUES (?, ?)
        `;

        db.query(sql, [userId, productId], (err, results) => {
            if (err) {
                console.error("Erreur de base de données lors de l'ajout aux favoris:", err);
                return res.status(500).json({ message: "Erreur lors de l'ajout aux favoris." });
            }

            res.status(200).json({ message: "Produit ajouté aux favoris avec succès." });
        });
    });
});

// Get Favorites Route
router.get('/favoris', authenticateJWT, (req, res) => {
    const userId = req.user.userId;

    const query = `
        SELECT 
            uzr4ephf_posts.ID as id, 
            uzr4ephf_posts.post_title as name, 
            uzr4ephf_postmeta.meta_value as price,
            uzr4ephf_posts.guid as image
        FROM uzr4ephf_posts
        JOIN uzr4ephf_arsam_user_favoris 
            ON uzr4ephf_arsam_user_favoris.product_id = uzr4ephf_posts.ID
        LEFT JOIN uzr4ephf_postmeta 
            ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id 
            AND uzr4ephf_postmeta.meta_key = "_price"
        WHERE uzr4ephf_arsam_user_favoris._arsam_user_id = ?
        AND uzr4ephf_posts.post_type = "product"
        AND uzr4ephf_posts.post_status = "publish"
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des produits favoris:', err);
            return res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits favoris' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun produit favori trouvé.' });
        }

        res.json(results);
    });
});

module.exports = router;

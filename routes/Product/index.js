const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");
const  authenticateJWT  = require("../Clients/index"); 
//recuperer tous les produits 
router.get('/', (req, res) => {
    const query = `
      SELECT uzr4ephf_posts.ID as id, 
             uzr4ephf_posts.post_title as name, 
             uzr4ephf_postmeta.meta_value as price,
             uzr4ephf_posts.guid as image,
             GROUP_CONCAT(uzr4ephf_terms.name) as categories
      FROM uzr4ephf_posts
      LEFT JOIN uzr4ephf_postmeta ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id
      LEFT JOIN uzr4ephf_term_relationships ON uzr4ephf_posts.ID = uzr4ephf_term_relationships.object_id
      LEFT JOIN uzr4ephf_term_taxonomy ON uzr4ephf_term_relationships.term_taxonomy_id = uzr4ephf_term_taxonomy.term_taxonomy_id
      LEFT JOIN uzr4ephf_terms ON uzr4ephf_term_taxonomy.term_id = uzr4ephf_terms.term_id
      WHERE uzr4ephf_posts.post_type = "product" 
        AND uzr4ephf_posts.post_status = "publish"
        AND uzr4ephf_postmeta.meta_key = "_price"
      GROUP BY uzr4ephf_posts.ID;  -- Utiliser GROUP BY pour éviter les doublons
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des produits:', err);
        res.status(500).json({ error: 'Erreur serveur' });
        return;
      }
      res.json(results);
    });
  });

  // Route pour récupérer les informations d'un produit spécifique avec sa catégorie
router.post('/get-product', (req, res) => {
    const { id: productId } = req.body; // Récupérer l'ID du produit depuis le corps de la requête
    
    if (!productId) {
      return res.status(400).json({ error: "L'ID du produit est requis dans le corps de la requête." });
    }
  
    const query = `
      SELECT uzr4ephf_posts.ID as id, 
             uzr4ephf_posts.post_title as name, 
             uzr4ephf_postmeta.meta_value as price,
             uzr4ephf_posts.guid as image,
             uzr4ephf_posts.post_content as description,
             GROUP_CONCAT(uzr4ephf_terms.name) as categories
      FROM uzr4ephf_posts
      LEFT JOIN uzr4ephf_postmeta ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id
      LEFT JOIN uzr4ephf_term_relationships ON uzr4ephf_posts.ID = uzr4ephf_term_relationships.object_id
      LEFT JOIN uzr4ephf_term_taxonomy ON uzr4ephf_term_relationships.term_taxonomy_id = uzr4ephf_term_taxonomy.term_taxonomy_id
      LEFT JOIN uzr4ephf_terms ON uzr4ephf_term_taxonomy.term_id = uzr4ephf_terms.term_id
      WHERE uzr4ephf_posts.ID = ? 
        AND uzr4ephf_posts.post_type = "product" 
        AND uzr4ephf_posts.post_status = "publish"
        AND uzr4ephf_postmeta.meta_key = "_price"
      GROUP BY uzr4ephf_posts.ID;
    `;
  
    db.query(query, [productId], (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération du produit:', err);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération du produit' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Produit non trouvé' });
      }
  
      res.json(results[0]); // Retourner le premier produit trouvé
    });
  });

/********************************Afficher les produits d'une categorie specifique **************************************** */
router.post('/category', (req, res) => {
    const { categoryName } = req.body; // Récupérer le nom de la catégorie depuis le corps de la requête

    if (!categoryName) {
        return res.status(400).json({ error: "Le nom de la catégorie est requis dans le corps de la requête." });
    }

    const query = `
      SELECT uzr4ephf_posts.ID as id, 
             uzr4ephf_posts.post_title as name, 
             uzr4ephf_postmeta.meta_value as price,
             uzr4ephf_posts.guid as image,
             GROUP_CONCAT(uzr4ephf_terms.name) as categories
      FROM uzr4ephf_posts
      LEFT JOIN uzr4ephf_postmeta ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id
      LEFT JOIN uzr4ephf_term_relationships ON uzr4ephf_posts.ID = uzr4ephf_term_relationships.object_id
      LEFT JOIN uzr4ephf_term_taxonomy ON uzr4ephf_term_relationships.term_taxonomy_id = uzr4ephf_term_taxonomy.term_taxonomy_id
      LEFT JOIN uzr4ephf_terms ON uzr4ephf_term_taxonomy.term_id = uzr4ephf_terms.term_id
      WHERE uzr4ephf_posts.post_type = "product" 
        AND uzr4ephf_posts.post_status = "publish"
        AND uzr4ephf_postmeta.meta_key = "_price"
        AND uzr4ephf_terms.name = ?
      GROUP BY uzr4ephf_posts.ID;
    `;

    db.query(query, [categoryName], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des produits par catégorie:', err);
            return res.status(500).json({ error: 'Erreur serveur lors de la récupération des produits' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun produit trouvé dans cette catégorie' });
        }

        res.json(results);
    });
});
/**************************************************chercher un produitproduit************************** */
router.post('/search-product', (req, res) => {
    const { productName } = req.body; // Récupérer le nom du produit depuis le corps de la requête

    if (!productName) {
        return res.status(400).json({ error: "Le nom du produit est requis dans le corps de la requête." });
    }

    const query = `
      SELECT uzr4ephf_posts.ID as id, 
             uzr4ephf_posts.post_title as name, 
             uzr4ephf_postmeta.meta_value as price,
             uzr4ephf_posts.guid as image,
             uzr4ephf_posts.post_content as description,
             GROUP_CONCAT(uzr4ephf_terms.name) as categories
      FROM uzr4ephf_posts
      LEFT JOIN uzr4ephf_postmeta ON uzr4ephf_posts.ID = uzr4ephf_postmeta.post_id
      LEFT JOIN uzr4ephf_term_relationships ON uzr4ephf_posts.ID = uzr4ephf_term_relationships.object_id
      LEFT JOIN uzr4ephf_term_taxonomy ON uzr4ephf_term_relationships.term_taxonomy_id = uzr4ephf_term_taxonomy.term_taxonomy_id
      LEFT JOIN uzr4ephf_terms ON uzr4ephf_term_taxonomy.term_id = uzr4ephf_terms.term_id
      WHERE uzr4ephf_posts.post_type = "product" 
        AND uzr4ephf_posts.post_status = "publish"
        AND uzr4ephf_postmeta.meta_key = "_price"
        AND uzr4ephf_posts.post_title LIKE ?
      GROUP BY uzr4ephf_posts.ID;
    `;

    db.query(query, [`%${productName}%`], (err, results) => {
        if (err) {
            console.error('Erreur lors de la recherche du produit:', err);
            return res.status(500).json({ error: 'Erreur serveur lors de la recherche du produit' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun produit trouvé avec ce nom' });
        }

        res.json(results);
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

  const sql = `
      INSERT INTO uzr4ephf_arsam_personalized_orders (_arsam_user_id, description, date, telephone)
      VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [userId, description, date, telephone], (err, result) => {
      if (err) {
          console.error("Erreur de base de données:", err);
          return res.status(500).json({ message: "Erreur lors de la création de la commande personnalisée." });
      }
      res.status(201).json({ message: "Commande personnalisée ajoutée avec succès", orderId: result.insertId });
  });
});
/*************************************recuperer les commande personnalise passe par un client specifique ********** */
router.get("/p-orders", authenticateJWT, (req, res) => {
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

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../../mysql/db"); 



//recuperer tous les produits 
// Dans votre fichier de routes (routes/clients.js)
// Dans routes/clients.js
// Dans routes/clients.js
router.get("/products", (req, res) => {
  const query = `
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
       )) as image_url,
      GROUP_CONCAT(DISTINCT terms.name) as categories,
      p.post_content as description
  FROM uzr4ephf_posts p
  LEFT JOIN uzr4ephf_postmeta pm_price 
      ON p.ID = pm_price.post_id 
      AND pm_price.meta_key = '_price'
  LEFT JOIN uzr4ephf_term_relationships tr 
      ON p.ID = tr.object_id
  LEFT JOIN uzr4ephf_term_taxonomy tt 
      ON tr.term_taxonomy_id = tt.term_taxonomy_id
  LEFT JOIN uzr4ephf_terms terms 
      ON tt.term_id = terms.term_id
  WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  GROUP BY p.ID;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des produits:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
      }

      // Formater les résultats avec les bonnes URLs d'images
      const formattedResults = results.map(product => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price || 0),
          image: product.image_url || 'default-image-url',
          categories: product.categories ? product.categories.split(',') : [],
          description: product.description || ''
      }));

      console.log('Formatted products:', formattedResults);
      res.json(formattedResults);
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
             uzr4ephf_postmeta.meta_value as price,npm install cors

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

// In your Node.js backend
router.post('/category', (req, res) => {
  const { categoryName } = req.body;
  
  const query = `
  SELECT 
      p.ID as id,
      p.post_title as name,
      pm_price.meta_value as price,
      (SELECT pm_img.meta_value 
       FROM uzr4ephf_postmeta pm_img 
       WHERE pm_img.post_id = p.ID 
       AND pm_img.meta_key = '_thumbnail_id') as thumbnail_id,
      (SELECT guid 
       FROM uzr4ephf_posts img 
       WHERE img.ID = (
           SELECT pm_img.meta_value 
           FROM uzr4ephf_postmeta pm_img 
           WHERE pm_img.post_id = p.ID 
           AND pm_img.meta_key = '_thumbnail_id'
       )
      ) as image,
      p.post_content as description,
      GROUP_CONCAT(t.name) as categories
  FROM uzr4ephf_posts p
  LEFT JOIN uzr4ephf_postmeta pm_price ON p.ID = pm_price.post_id AND pm_price.meta_key = '_price'
  LEFT JOIN uzr4ephf_term_relationships tr ON p.ID = tr.object_id
  LEFT JOIN uzr4ephf_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
  LEFT JOIN uzr4ephf_terms t ON tt.term_id = t.term_id
  WHERE p.post_type = 'product'
  AND p.post_status = 'publish'
  AND t.name = ?
  GROUP BY p.ID;
  `;

  db.query(query, [categoryName], (err, results) => {
      if (err) {
          console.error('Error fetching products:', err);
          return res.status(500).json({ error: 'Server error while fetching products' });
      }
      
      // Process results to ensure proper image URLs
      const processedResults = results.map(product => ({
          ...product,
          image: product.image || `https://wnsansgluten.ca/wp-content/uploads/${product.id}/product-image.jpg` // Fallback URL
      }));
      
      res.json(processedResults);
  });
});


/**************************************************chercher un produitproduit************************** */
router.post('/search-product', (req, res) => {
  const { productName } = req.body;
  
  if (!productName) {
      return res.status(400).json({ 
          error: "Le nom du produit est requis dans le corps de la requête." 
      });
  }

  const query = `
  SELECT 
      p.ID as id,
      p.post_title as name,
      pm_price.meta_value as price,
      COALESCE(
          (SELECT guid 
           FROM uzr4ephf_posts img 
           WHERE img.ID = (
               SELECT meta_value 
               FROM uzr4ephf_postmeta 
               WHERE post_id = p.ID 
               AND meta_key = '_thumbnail_id'
           )
          ),
          p.guid
      ) as image,
      p.post_content as description,
      GROUP_CONCAT(t.name) as categories
  FROM uzr4ephf_posts p
  LEFT JOIN uzr4ephf_postmeta pm_price ON p.ID = pm_price.post_id 
      AND pm_price.meta_key = '_price'
  LEFT JOIN uzr4ephf_term_relationships tr ON p.ID = tr.object_id
  LEFT JOIN uzr4ephf_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
  LEFT JOIN uzr4ephf_terms t ON tt.term_id = t.term_id
  WHERE p.post_type = "product"
  AND p.post_status = "publish"
  AND p.post_title LIKE ?
  GROUP BY p.ID;
  `;

  db.query(query, [`%${productName}%`], (err, results) => {
      if (err) {
          console.error('Error searching products:', err);
          return res.status(500).json({ 
              error: 'Server error while searching products' 
          });
      }

      // Process results to ensure proper image URLs
      const processedResults = results.map(product => ({
          ...product,
          image: product.image || 
                 `https://wnsansgluten.ca/wp-content/uploads/default-product.jpg`
      }));

      res.json(processedResults);
  });
});

module.exports = router;

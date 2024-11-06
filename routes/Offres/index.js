const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");

// Récupérer les produits en offres
router.get("/", (req, res) => {
    const query = `
    SELECT p.ID as id,
    p.post_title as name,
    MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) AS regular_price,
    MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) AS sale_price,
    p.guid as image,
    GROUP_CONCAT(t.name) as categories
    FROM uzr4ephf_posts p
    LEFT JOIN uzr4ephf_postmeta pm ON p.ID = pm.post_id
    LEFT JOIN uzr4ephf_term_relationships tr ON p.ID = tr.object_id
    LEFT JOIN uzr4ephf_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    LEFT JOIN uzr4ephf_terms t ON tt.term_id = t.term_id
    WHERE p.post_type = "product"
    AND p.post_status = "publish"
    GROUP BY p.ID, p.post_title, p.guid
    HAVING sale_price IS NOT NULL;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des produits en promotion:", err);
            res.status(500).json({ error: "Erreur serveur" });
            return;
        }

        // Vérifier si des résultats ont été trouvés
        if (results.length === 0) {
            res.json({ message: "Aucune offre pour le moment." });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;

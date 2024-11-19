const express = require("express");
const router = express.Router();
const db = require("../../mysql/db");

// Récupérer les produits en offres
// Product.js


router.get("/sales", async (req, res) => {
    try {
        const query = `
            SELECT 
                p.ID as id,
                p.post_title as name,
                MAX(CASE WHEN pm.meta_key = '_regular_price' THEN pm.meta_value END) AS regular_price,
                MAX(CASE WHEN pm.meta_key = '_sale_price' THEN pm.meta_value END) AS sale_price,
                p.guid as image,
                p.post_content as description,
                GROUP_CONCAT(t.name) as categories
            FROM uzr4ephf_posts p
            LEFT JOIN uzr4ephf_postmeta pm ON p.ID = pm.post_id
            LEFT JOIN uzr4ephf_term_relationships tr ON p.ID = tr.object_id
            LEFT JOIN uzr4ephf_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            LEFT JOIN uzr4ephf_terms t ON tt.term_id = t.term_id
            WHERE p.post_type = 'product'
            AND p.post_status = 'publish'
            GROUP BY p.ID, p.post_title, p.guid
            HAVING sale_price IS NOT NULL AND sale_price > 0;
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching sale products:", err);
                return res.status(500).json({ 
                    success: false, 
                    error: "Database error" 
                });
            }

            // Set proper headers
            res.setHeader('Content-Type', 'application/json');
            
            // Send response
            return res.json({
                success: true,
                products: results || [],
                count: results ? results.length : 0
            });
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Server error" 
        });
    }
});



module.exports = router;

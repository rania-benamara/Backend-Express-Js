const express = require("express");
const router = express.Router();
const db = require("../mysql/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const secretKey = "cle"; 

// Middleware pour vérifier le JWT
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
  
  /****************************Fonction login*******************************/
  router.post("/login", (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
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
          return res.status(401).json({ message: "Invalid credentials" });
        }
  
        // Générer un token JWT
        const token = jwt.sign({ userId: user.arsam_user_id, email: user.email }, secretKey, { expiresIn: "1h" });
  
        res.status(200).json({ message: "Login successful", token });
      });
    });
  });
  
  /***********************************register************************************/
  router.post("/register", (req, res) => {
    const { nom, prenom, telephone, email, password, date_naissance } = req.body || {};
  
    // Vérification des champs obligatoires
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
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
          message: "User registered successfully",
          userId: result.insertId,
        });
      });
    });
  });
  
  /*************************changer mot de passe ******************/
  router.put('/change-password', authenticateJWT, (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;
  
    // Vérification des champs obligatoires
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }
  
    // Vérification que les nouveaux mots de passe correspondent
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
  
    // Hasher le nouveau mot de passe
    bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
      if (err) return res.status(500).json({ message: "Error hashing new password" });
  
      // Mettre à jour le mot de passe dans la base de données
      const sqlUpdate = "UPDATE uzr4ephf_arsam_user SET password = ? WHERE arsam_user_id = ?";
      db.query(sqlUpdate, [newHashedPassword, userId], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error updating password" });
        }
        if (result.affectedRows > 0) {
          res.status(200).json({ message: "Password updated successfully" });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      });
    });
  });
  
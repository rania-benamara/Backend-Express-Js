# Backend-Express-Js
# 🍞 Backend Express.js – Wn Sans Gluten Mobile App

This project is a RESTful API built with **Node.js** and **Express.js**. It serves as the backend for a mobile application designed for the bakery Wn Sans Gluten. The backend handles order tracking, menu display, and client account management.

## 🎯 Project Purpose

The main goal of this backend is to support a bakery’s mobile app by offering:

- A client-friendly menu interface
- Account creation and login system
- Order management (create, update, track orders)
- A scalable base for integrating more features like admin dashboard or payment system

## 🔧 Features

- Client account creation and authentication
- Fetching and displaying bakery menu items
- Creating and managing orders
- Modular architecture for easy scaling and maintenance

## 🚀 Technologies Used

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [Nodemon](https://nodemon.io/) – for development
- (Optional) MongoDB or other DB to be added


## 🛠️ Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rania-benamara/Backend-Express-Js.git
   cd Backend-Express-Js

2. **Install dependencies:**
   ```bash
   npm install
3. **Run the server:**
   ```bash
   npm run dev
4. The server will run on http://localhost:3000 by default.
5. **Example Endpoints:**

| Method | Endpoint         | Description                 |
| ------ | ---------------- | --------------------------- |
| POST   | /api/signup      | Create a new client account |
| POST   | /api/login       | Authenticate client         |
| GET    | /api/menu        | Get all bakery items        |


  


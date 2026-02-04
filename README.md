# ⚡ CollabStudy - Backend Server

This is the server-side application for **CollabStudy**, a real-time collaborative study platform. It handles user authentication, file management, and instant data synchronization between users using WebSockets.

**🔗 Live Server:** Hosted on [Render](https://render.com)
**🔗 Frontend Repo:** [Link to your Frontend Repo]

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB Atlas (Mongoose)
* **Real-Time:** Socket.io (WebSockets)
* **Authentication:** JWT (JSON Web Tokens)
* **File Handling:** Multer (PDF Uploads)
* **Security:** CORS & Helmet

---

## 🚀 Key Features

* **📡 Real-Time WebSockets:** Powered by `Socket.io`, allowing instant syncing of:
    * PDF Page Navigation
    * Highlights & Annotations
    * Chat Messages
    * Cursor Movements
* **🔐 Secure Auth:** User registration and login with encrypted passwords and JWT authentication.
* **📂 Document Management:** Handles PDF uploads via REST API and serves static files securely.
* **💾 Persistent Data:** Automatically saves session data (notes, chat history) to MongoDB so data isn't lost on refresh.

---

## ⚙️ Environment Variables

To run this project locally, you will need to create a `.env` file in the root directory with the following variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=3001

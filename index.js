const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./db");
const Room = require("./models/Room");
const authRoute = require("./routes/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- 1. SETUP APP & SERVER ---
const app = express();
const server = http.createServer(app);

// --- 2. MIDDLEWARE (THE MASTER FIX) ---
// This function allows ANY Vercel link and Localhost automatically
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow Localhost and ANY Vercel App
    if (origin.includes("localhost") || origin.includes("vercel.app")) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// --- 3. DATABASE ---
connectDB();

// --- 4. ROUTES ---
app.use("/api/auth", authRoute);

// --- 5. FILE UPLOADS SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Upload Route (FIXED for Mixed Content Error)
app.post("/api/upload", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json("No file uploaded!");
    
    // SMART PROTOCOL CHECK:
    // If on localhost, use 'http'. If on Render/Vercel, force 'https'.
    const protocol = req.get("host").includes("localhost") ? "http" : "https";
    
    const fileUrl = `${protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

// --- 6. SOCKET.IO SETUP (THE MASTER FIX) ---
const io = new Server(server, {
  cors: corsOptions // Use the same "Allow All Vercel" rule
});

// --- 🧠 SERVER MEMORY ---
const roomState = {}; 

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    if (roomState[roomId]) {
      socket.emit("receive-pdf", roomState[roomId].pdfUrl);
      socket.emit("receive_page_change", roomState[roomId].page);
    }
    try {
      const room = await Room.findOneAndUpdate(
        { roomId: roomId },
        { $setOnInsert: { highlights: [], notes: [] } },
        { new: true, upsert: true }
      );
      socket.emit("load_data", { highlights: room.highlights, notes: room.notes });
    } catch (err) {
      console.error("Error loading room data:", err);
    }
  });

  socket.on("upload-pdf", ({ room, url }) => {
    if (!roomState[room]) roomState[room] = { page: 1 };
    roomState[room].pdfUrl = url;
    roomState[room].page = 1;
    socket.to(room).emit("receive-pdf", url);
  });

  socket.on("change_page", ({ room, page }) => {
    if (roomState[room]) roomState[room].page = page;
    else roomState[room] = { page: page };
    socket.to(room).emit("receive_page_change", page);
  });

  socket.on("send_highlight", async (data) => {
    socket.to(data.roomId).emit("receive_highlight", data);
    try { await Room.updateOne({ roomId: data.roomId }, { $push: { highlights: data } }); } catch (err) { console.error(err); }
  });

  socket.on("send_note", async (data) => {
    socket.to(data.roomId).emit("receive_note", data);
    try { await Room.updateOne({ roomId: data.roomId }, { $push: { notes: data } }); } catch (err) { console.error(err); }
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("cursor_move", (data) => {
    socket.to(data.roomId).emit("receive_cursor", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
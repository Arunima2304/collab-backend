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

// --- 2. MIDDLEWARE (FIXED FOR VERCEL) ---
// We explicitly allow your Vercel Frontend here
const allowedOrigins = [
  "http://localhost:5173",
  "https://collab-frontend-git-main-arunimachakrabortys-projects.vercel.app",
  "https://collab-frontend-hl7g2lxwk-arunimachakrabortys-projects.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// --- 3. DATABASE ---
connectDB();

// --- 4. ROUTES ---
app.use("/api/auth", authRoute);

// --- 5. FILE UPLOADS SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Save file as "timestamp-name.pdf" to avoid duplicates
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Serve the uploads folder statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Upload Route
app.post("/api/upload", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json("No file uploaded!");
    }
    // Return the full URL
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

// --- 6. SOCKET.IO SETUP (FIXED FOR VERCEL) ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Use the same allowed origins as above
    methods: ["GET", "POST"],
    credentials: true
  },
});

// --- 🧠 SERVER MEMORY (Stores PDF & Page for each room) ---
const roomState = {}; 

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // A. Load PDF & Page from Memory (If exists)
    if (roomState[roomId]) {
      socket.emit("receive-pdf", roomState[roomId].pdfUrl);
      socket.emit("receive_page_change", roomState[roomId].page);
    }

    // B. Load Highlights/Notes from MongoDB
    try {
      const room = await Room.findOneAndUpdate(
        { roomId: roomId },
        { $setOnInsert: { highlights: [], notes: [] } },
        { new: true, upsert: true }
      );
      socket.emit("load_data", { 
        highlights: room.highlights, 
        notes: room.notes 
      });
    } catch (err) {
      console.error("Error loading room data:", err);
    }
  });

  // --- PDF UPLOAD SYNC ---
  socket.on("upload-pdf", ({ room, url }) => {
    // 1. Save to Memory
    if (!roomState[room]) roomState[room] = { page: 1 };
    roomState[room].pdfUrl = url;
    roomState[room].page = 1;

    // 2. Broadcast to room
    socket.to(room).emit("receive-pdf", url);
  });

  // --- PAGE CHANGE SYNC ---
  socket.on("change_page", ({ room, page }) => {
    // 1. Update Memory
    if (roomState[room]) {
        roomState[room].page = page;
    } else {
        roomState[room] = { page: page };
    }
    // 2. Broadcast to room
    socket.to(room).emit("receive_page_change", page);
  });

  // --- HIGHLIGHTS ---
  socket.on("send_highlight", async (data) => {
    socket.to(data.roomId).emit("receive_highlight", data);
    try {
      await Room.updateOne({ roomId: data.roomId }, { $push: { highlights: data } });
    } catch (err) {
      console.error(err);
    }
  });

  // --- NOTES ---
  socket.on("send_note", async (data) => {
    socket.to(data.roomId).emit("receive_note", data);
    try {
      await Room.updateOne({ roomId: data.roomId }, { $push: { notes: data } });
    } catch (err) {
      console.error(err);
    }
  });

  // --- CHAT ---
  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  // --- CURSORS ---
  socket.on("cursor_move", (data) => {
    socket.to(data.roomId).emit("receive_cursor", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// --- 7. START SERVER ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
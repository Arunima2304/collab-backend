const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  
  // Feature 3: Real-Time Highlighting
  highlights: [
    {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      roomId: String,
    },
  ],

  // Feature 4: Add Notes (Sticky Notes)
  notes: [
    {
      x: Number,
      y: Number,
      text: String,
      author: String, // e.g., "User 1234"
    },
  ],
});

module.exports = mongoose.model("Room", RoomSchema);
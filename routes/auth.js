const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersecretkey123";

// REGISTER ROUTE
router.post("/register", async (req, res) => {
  try {
    // 1. READ ALL 3 FIELDS FROM THE FRONTEND
    const { username, email, password } = req.body; // <--- CHECK THIS!

    console.log("📝 Registering:", username, email); // Debug log

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create User WITH Email
    const newUser = new User({
      username: username,
      email: email,       // <--- CRITICAL: MUST SAVE EMAIL
      password: hashedPassword,
    });

    const user = await newUser.save();
    res.status(200).json(user);
  } catch (err) {
    console.error("❌ Registration Error:", err); // Print error to terminal
    res.status(500).json(err);
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(404).json("User not found!");

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json("Wrong password!");

    const token = jwt.sign({ _id: user._id, username: user.username }, JWT_SECRET);
    res.status(200).json({ token, username: user.username });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
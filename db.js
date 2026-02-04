const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // I changed 'collabStudy' to 'CollabStudyFinal' in the link below
    await mongoose.connect(
      "mongodb+srv://arunimachakraborty9h11283p10_db_user:collab123@splithub.p7bbafc.mongodb.net/CollabStudyFinal?retryWrites=true&w=majority&appName=SplitHub"
    );

    console.log("✅ MongoDB Atlas Connected Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
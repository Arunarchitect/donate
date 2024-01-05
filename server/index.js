const express = require("express");
const https = require("https");
const fs = require("fs");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Use CORS middleware for all routes
app.use(cors());

// Serve React app in production mode over HTTPS
if (process.env.NODE_ENV === "production") {
  // Serve static files from the build folder
  const buildFolderPath = path.join(__dirname, "/public", "build");
  app.use(express.static(buildFolderPath));

  // Catch-all route to serve the React app
  app.get("*", (req, res) => {
    const indexPath = path.join(buildFolderPath, "index.html");
    res.sendFile(indexPath);
  });

  // Configure HTTPS
  const privateKeyPath = "/etc/letsencrypt/live/api.arunarchitect.in/privkey.pem";
  const certificatePath = "/etc/letsencrypt/live/api.arunarchitect.in/fullchain.pem";

  if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");
    const certificate = fs.readFileSync(certificatePath, "utf8");
    const credentials = { key: privateKey, cert: certificate };

    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(PORT, () => {
      console.log("Listening on port", PORT);
    });
  } else {
    console.error("Private key or certificate not found.");
  }
}

// API endpoints
app.post("/order", cors(), async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const options = req.body;
    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send("Error1");
    }

    res.json(order);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error 2");
  }
});

app.post("/order/validate", cors(), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = sha.digest("hex");
  if (digest !== razorpay_signature) {
    return res.status(400).json({ msg: "Transaction is not legit!" });
  }

  res.json({
    msg: "success",
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
});

// Start the server
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log("Listening on port", PORT);
  });
}

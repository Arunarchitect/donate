const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001; // Use a default port if PORT is not specified

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Serve React app in development mode
if (process.env.NODE_ENV === "development") {
  // Proxy requests to the React development server
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:3000", // Change this to the actual URL of your React development server
      changeOrigin: true,
    })
  );
} else {
  // Serve static files from the build folder in production
  const buildFolderPath = path.join(__dirname, "/public", "build");
  app.use(express.static(buildFolderPath));

  // Catch-all route to serve the React app
  app.get("*", (req, res) => {
    const indexPath = path.join(buildFolderPath, "index.html");
    res.sendFile(indexPath);
  });
}

// API endpoints
app.post("/order", async (req, res) => {
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

app.post("/order/validate", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

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

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});

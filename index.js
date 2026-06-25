const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// Configuration Globals
const port = process.env.PORT || 3001;
const uri = process.env.MONGO_DB_URI;
const JWKS = `${process.env.CLIENT_URL}/api/auth/jwks`;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database State Containers
let db, collections = {};

async function dbConnection() {
  try {
    await client.connect();
    db = client.db(process.env.MONGO_DB);
    
    // Core Collection Initializations
    collections.user = db.collection("user");
    collections.category = db.collection("category");
    collections.artworks = db.collection("artworks");
    collections.reviews = db.collection("reviews");
    collections.plans = db.collection("plans");
    collections.orders = db.collection("orders");
    collections.subscriptions = db.collection("subscriptions");
    
    console.log("Pinged deployment. Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}
dbConnection().catch(console.dir);

// Global Reusable Boilerplate Utilities
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("Route Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  });
};

const checkDb = (collectionName) => (req, res, next) => {
  if (!collections[collectionName]) {
    return res.status(500).json({ message: `Database collection '${collectionName}' not initialized` });
  }
  req.targetCollection = collections[collectionName];
  next();
};

const parseIdQuery = (idStr) => {
  if (!idStr) return null;
  return ObjectId.isValid(idStr) ? new ObjectId(idStr) : idStr;
};

// Security Gateway Token Verification
const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized! Token missing." });
  }
  
  const token = authorization.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const jwks = createRemoteJWKSet(new URL(JWKS));
    const { payload } = await jwtVerify(token, jwks);
    req.user = payload;
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Base Endpoint Health Check
app.get("/", (req, res) => res.send("Hello World!"));

// Users Route Layer
app.get("/user", checkDb("user"), asyncHandler(async (req, res) => {
  const result = await req.targetCollection.find().toArray();
  res.status(200).json({ success: true, data: result });
}));

// Unified Artworks Query Logic
app.get("/artworks", checkDb("artworks"), asyncHandler(async (req, res) => {
  const { id, search, userId, features, approvedOnly } = req.query;
  let query = {};

  if (approvedOnly === "true") {
    query.status = { $in: ["available", "unavailable"] };
  }

  const parsedId = parseIdQuery(id);
  if (parsedId) query._id = parsedId;

  const parsedArtistId = parseIdQuery(userId);
  if (parsedArtistId) query.artistId = parsedArtistId;

  if (features) {
    query.features = features === "true";
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { artistName: { $regex: search, $options: "i" } },
    ];
  }

  const result = await req.targetCollection.find(query).toArray();
  res.status(200).json({ success: true, data: result });
}));

app.post("/artworks", checkDb("artworks"), asyncHandler(async (req, res) => {
  const { title, artistId, artistName, description, price, category, imageUrl, features } = req.body;

  if (!title || !artistId || !price || !category || !imageUrl) {
    return res.status(400).json({
      message: "Missing required fields (title, artistId, price, category, imageUrl)",
    });
  }

  const newArtwork = {
    title: title.trim(),
    artistId: new ObjectId(artistId),
    artistName: artistName || "",
    description: description || "",
    price: Number(price),
    category,
    imageUrl,
    features: features === true || features === "true",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await req.targetCollection.insertOne(newArtwork);
  res.status(201).json({ success: true, message: "Artwork uploaded successfully.", artworkId: result.insertedId });
}));

app.put("/artworks/:id", checkDb("artworks"), asyncHandler(async (req, res) => {
  const artworkId = req.params.id;
  const { title, description, price, category, imageUrl } = req.body;

  if (!ObjectId.isValid(artworkId)) {
    return res.status(400).json({ success: false, message: "Invalid Artwork ID Format" });
  }

  const result = await req.targetCollection.updateOne(
    { _id: new ObjectId(artworkId) },
    {
      $set: {
        title: title.trim(),
        description,
        price: Number(price),
        category,
        imageUrl,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 1) {
    res.json({ success: true, message: "Artwork updated successfully in database!" });
  } else {
    res.status(404).json({ success: false, message: "Artwork not found in database" });
  }
}));

app.patch("/artworks", checkDb("artworks"), asyncHandler(async (req, res) => {
  const { artId } = req.query;
  const { status } = req.body;

  if (!artId || !status) {
    return res.status(400).json({ success: false, message: "Artwork ID and Status values are required" });
  }

  await req.targetCollection.updateOne({ _id: new ObjectId(artId) }, { $set: { status } });
  return res.status(200).json({ success: true, message: "Artwork status updated successfully" });
}));

app.delete("/artworks/:id", checkDb("artworks"), asyncHandler(async (req, res) => {
  const result = await req.targetCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 1) {
    res.json({ success: true, message: "Artwork deleted successfully from database" });
  } else {
    res.status(404).json({ success: false, message: "Artwork not found" });
  }
}));

// Categories Route Layer
app.get("/category", checkDb("category"), asyncHandler(async (req, res) => {
  const result = await req.targetCollection.find().toArray();
  res.status(200).json({ success: true, data: result });
}));

// Orders Management Layer
app.post("/artwork-orders", checkDb("orders"), asyncHandler(async (req, res) => {
  const { email, artworkId, userId, amount, paymentIntentId, purchasedAt } = req.body;

  if (!artworkId || !email) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const newOrder = {
    buyerEmail: email,
    buyerId: userId ? new ObjectId(userId) : null,
    artworkId: new ObjectId(artworkId),
    amount: parseFloat(amount),
    paymentIntentId,
    status: "completed",
    purchasedAt: purchasedAt ? new Date(purchasedAt) : new Date(),
  };

  const orderResult = await req.targetCollection.insertOne(newOrder);
  const artworkUpdateResult = await collections.artworks.updateOne(
    { _id: new ObjectId(artworkId) },
    { $set: { status: "sold", buyerEmail: email, soldAt: new Date() } }
  );

  if (orderResult.insertedId && artworkUpdateResult.modifiedCount > 0) {
    return res.status(201).json({ success: true, message: "Order placed successfully!", orderId: orderResult.insertedId });
  } else {
    return res.status(500).json({ success: false, message: "Failed to cleanly complete atomic order operations." });
  }
}));

app.get("/my-orders", checkDb("orders"), asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: "Email query parameter is required" });

  const orders = await req.targetCollection.aggregate([
    { $match: { buyerEmail: email, status: "completed" } },
    { $lookup: { from: "artworks", localField: "artworkId", foreignField: "_id", as: "artworkDetails" } },
    { $unwind: "$artworkDetails" },
    { $sort: { purchasedAt: -1 } },
  ]).toArray();

  return res.status(200).json({ success: true, count: orders.length, data: orders });
}));
app.get("/admin/transactions", asyncHandler(async (req, res) => {
  const orders = await collections.orders.find().toArray();
  const purchaseTransactions = orders.map(order => ({
    transactionId: order.paymentIntentId || order._id,
    type: "PURCHASE", 
    email: order.buyerEmail,
    date: order.purchasedAt,
    amount: order.amount
  }));

  const subscriptions = await collections.subscriptions.find().toArray();
  const subscriptionTransactions = subscriptions.map(sub => ({
    transactionId: sub.paymentIntentId || sub.subscriptionId || sub._id,
    type: "SUBSCRIPTION", 
    email: sub.email,
    date: sub.createdAt || sub.purchasedAt, 
    amount: sub.amount || 0
  }));

  const combinedTransactions = [...purchaseTransactions, ...subscriptionTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  res.status(200).json({
    success: true,
    count: combinedTransactions.length,
    data: combinedTransactions
  });
}));
app.get("/admin/orders", checkDb("orders"), asyncHandler(async (req, res) => {
  const orders = await req.targetCollection.aggregate([
    {
      $lookup: {
        from: "artworks",
        localField: "artworkId",
        foreignField: "_id",
        as: "artworkDetails"
      }
    },
    { $unwind: { path: "$artworkDetails", preserveNullAndEmptyArrays: true } },
    { $sort: { purchasedAt: -1 } }
  ]).toArray();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
}));
app.get("/sales-history", checkDb("orders"), asyncHandler(async (req, res) => {
  const { artistId } = req.query;
  if (!artistId) return res.status(400).json({ success: false, message: "Artist ID query parameter is required" });

  const sales = await req.targetCollection.aggregate([
    { $lookup: { from: "artworks", localField: "artworkId", foreignField: "_id", as: "artworkDetails" } },
    { $unwind: "$artworkDetails" },
    { $match: { status: "completed", "artworkDetails.artistId": artistId } },
    { $sort: { purchasedAt: -1 } },
  ]).toArray();

  const totalEarnings = sales.reduce((sum, item) => sum + (item.amount || 0), 0);
  res.status(200).json({ success: true, count: sales.length, totalEarnings, data: sales });
}));

// Plans Route Layer
app.get("/plans", checkDb("plans"), asyncHandler(async (req, res) => {
  const { planId } = req.query;
  const result = await req.targetCollection.find({ id: planId ?? "user_free" }).toArray();
  res.status(200).json({ success: true, data: result });
}));

// Subscriptions & Memberships Layer
app.post("/subscriptions", checkDb("subscriptions"), asyncHandler(async (req, res) => {
  const data = req.body;

  const subInfo = {
    email: data.email,
    planId: data.planId,
    amount: data.amount ?? parseFloat(data.amount),
    paymentIntentId: data.paymentIntentId || data.subscriptionId || null, 
    createdAt: new Date() 
  };

  await req.targetCollection.insertOne(subInfo);
  
  const updateResult = await collections.user.updateOne(
    { email: subInfo.email },
    { $set: { plan: subInfo.planId } }
  );

  if (updateResult.modifiedCount === 0) {
    return res.status(404).json({ 
      success: false, 
      message: "User tier already matches target or user profile missing" 
    });
  }

  return res.status(200).json({ 
    success: true, 
    message: "Subscription and User Plan updated successfully!" 
  });
}));

// Feedback & Reviews Route Layer
app.get("/reviews", checkDb("reviews"), asyncHandler(async (req, res) => {
  const { id, userId } = req.query;
  let query = {};

  const parsedId = parseIdQuery(id);
  if (parsedId) query._id = parsedId;

  const parsedArtistId = parseIdQuery(userId);
  if (parsedArtistId) query.artistId = parsedArtistId;

  const result = await req.targetCollection.find(query).toArray();
  res.status(200).json({ success: true, data: result });
}));

app.listen(port, () => {
  console.log(`Application server runtime online on port: ${port}`);
});
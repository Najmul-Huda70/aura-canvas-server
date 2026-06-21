// 1. Load environment variables at the very beginning
const dotenv = require("dotenv");
dotenv.config();

// 2. Import core modules
const express = require("express");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

// FIX: Always require "mongodb" string, not env variable
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { success } = require("better-auth");

// 3. Initialize Express app instance
const app = express();

// 4. Setup Global Middlewares
app.use(cors());
app.use(express.json());

// 5. Environmental configurations
const port = process.env.PORT || 3001; // Fallback default to 3001 if undefined
const uri = process.env.MONGO_DB_URI; // FIX: Matching your .env name
const JWKS = `${process.env.CLIENT_URL}/api/auth/jwks`;

// 6. MongoDB Client instance initializer
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Request logger middleware
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

// Security token verification custom routing gate
const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized! Token missing." });
  }
  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const jwks = createRemoteJWKSet(new URL(JWKS));
    const { payload } = await jwtVerify(token, jwks);
    req.user = payload;
    console.log(req.user);
  } catch (error) {
    console.error("Token validation failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

let artworkCollection;
let salesCollection;
let purchaseCollection;
// 7. Establish Connection to Database Instance Layer
async function dbConnection() {
  try {
    await client.connect();

    const db = client.db(process.env.MONGO_DB);
    artworkCollection = db.collection("artworks");
    salesCollection = db.collection("sales");
    purchaseCollection=db.collection("purchase");
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}
dbConnection().catch(console.dir);

// Base application check points
app.get("/", (req, res) => {
  res.send("Hello World!");
});
// artworks
app.get("/artworks", async (req, res) => {
  try {
    if (!artworkCollection) {
      return res
        .status(500)
        .json({ message: "Database collection not initialized" });
    }

    let query = {};
    const { id, search, userId, features } = req.query;

    if (id) {
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query._id = id;
      }
    }

    if (userId) {
      if (ObjectId.isValid(userId)) {
        query.artistId = new ObjectId(userId);
      } else {
        query.artistId = userId;
      }
    }

    if (features) {
      query.features = features === "true";
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { artistName: { $regex: search, $options: "i" } },
      ];
    }

    const result = await artworkCollection.find(query).toArray();

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error fetching artworks:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: error.message });
  }
});
app.post("/artworks", async (req, res) => {
  try {
    if (!artworkCollection) {
      return res
        .status(500)
        .json({ message: "Database artworks collection not initialized" });
    }

    const {
      title,
      artistId,
      description,
      price,
      category,
      imageUrl,
      features,
    } = req.body;

    if (!title || !artistId || !price || !category || !imageUrl) {
      return res.status(400).json({
        message:
          "Missing required fields (title, artistId, price, category, imageUrl)",
      });
    }

    const newArtwork = {
      title: title.trim(),
      artistId: new ObjectId(artistId),
      description: description || "",
      price: Number(price),
      category: category,
      imageUrl: imageUrl,
      features: features === true || features === "true",
      status: "available",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await artworkCollection.insertOne(newArtwork);

    res.status(201).json({
      success: true,
      message: "Artwork uploaded successfully.",
      artworkId: result.insertedId,
    });
  } catch (error) {
    console.error("Error inserting artwork:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});
app.put("/artworks/:id", async (req, res) => {
  try {
    const artworkId = req.params.id;
    console.log('artworkId: ',artworkId);
    const { title, description, price, category, imageUrl } = req.body;

   if (!ObjectId.isValid(artworkId)) {
      return res.status(400).json({ success: false, message: "Invalid Artwork ID Format" });
    }

    const updateData = {
      $set: {
        title: title.trim(),
        description: description,
        price: Number(price), 
        category: category,
        imageUrl: imageUrl,
        updatedAt: new Date() 
      }
    };

    const result = await artworkCollection.updateOne(
      { _id: new ObjectId(artworkId) }, 
      updateData
    );

    if (result.matchedCount === 1) {
      res.json({ success: true, message: "Artwork updated successfully in database!" });
    } else {
      res.status(404).json({ success: false, message: "Artwork not found in database" });
    }

  } catch (error) {
    console.error("Database Update Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.delete("/artworks/:id", async (req, res) => {
  const id = req.params.id;
  try {
    if (!artworkCollection) {
      return res
        .status(500)
        .json({ message: "Database collections not initialized" });
    }
    const result = await artworkCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.json({
        success: true,
        message: "Artwork deleted successfully from database",
      });
    } else {
      res.status(404).json({ success: false, message: "Artwork not found" });
    }
  } catch (error) {
    console.error("Error deleting artwork:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// purchase
app.get("/purchase",async(req,res)=>{
try {
    if (!purchaseCollection) {
      return res
        .status(500)
        .json({ message: "Database collection not initialized" });
    }

    let query = {};
    const { id, search, userId } = req.query;

    if (id) {
      if (ObjectId.isValid(id)) {
        query._id = new ObjectId(id);
      } else {
        query._id = id;
      }
    }

    if (userId) {
      if (ObjectId.isValid(userId)) {
        query.artistId = new ObjectId(userId);
      } else {
        query.artistId = userId;
      }
    }


    // if (search) {
    //   query.$or = [
    //     { title: { $regex: search, $options: "i" } },
    //     { artistName: { $regex: search, $options: "i" } },
    //   ];
    // }

    const result = await purchaseCollection.find(query).toArray();

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error fetching purchase:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error: error.message });
  }
})

app.post("/sales", async (req, res, next) => {
  const session = client.startSession();
  try {
    if (!salesCollection || !artworkCollection) {
      return res
        .status(500)
        .json({ message: "Database collections not initialized" });
    }

    const { artworkId, buyerId, amount, status, salingDate } = req.body;
    if (!artworkId || !buyerId || !amount) {
      return res
        .status(400)
        .json({
          message: "Missing required fields (artworkId, buyerId, amount)",
        });
    }
    session.startTransaction();
    const saleResult = await salesCollection.insertOne(newSale, { session });
    const artworkUpdateResult = await artworkCollection.updateOne(
      { _id: artworkId },
      { $set: { status: "sold", updatedAt: new Date().toISOString() } },
      { session },
    );
    if (artworkUpdateResult.matchedCount === 0) {
      throw new Error("Artwork not found with the provided ID");
    }
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "Sale recorded successfully and artwork status updated to sold.",
      saleId: saleResult.insertedId,
    });
  } catch (error) {
    console.error("Transaction aborted due to error:", error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  } finally {
    await session.endSession();
  }
});
// App server activation listener block
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

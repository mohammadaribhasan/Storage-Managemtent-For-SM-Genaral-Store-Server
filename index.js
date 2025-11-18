// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// Config
// -----------------------------
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://mdaribhasanpc_db_user:Nw64BPOZiDZnQfns@smstore.i8egyps.mongodb.net/?appName=SMStore";

const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let productsCol;
let customersCol;
let salesCol;
let saleItemsCol;

// -----------------------------
// Connect & Seed
// -----------------------------
async function connectDBAndSeed() {
  try {
    await client.connect();
    db = client.db("SMStore");

    productsCol = db.collection("products");
    customersCol = db.collection("customers");
    salesCol = db.collection("sales");
    saleItemsCol = db.collection("saleItems");

    console.log("✅ MongoDB connected");

    // Seed sample products if empty
    const productCount = await productsCol.countDocuments();
    if (productCount === 0) {
      await productsCol.insertMany([
        {
          name_en: "Potato",
          name_bn: "আলু",
          is_packed: false,
          unit_type: "KG",
          base_price: 35,
          stock_quantity: 100,
          image_url: "https://via.placeholder.com/300?text=Potato",
        },
        {
          name_en: "Rice 5kg Pack",
          name_bn: "চাল ৫ কেজি প্যাক",
          is_packed: true,
          unit_type: "Pack",
          base_price: 480,
          stock_quantity: 50,
          image_url: "https://via.placeholder.com/300?text=Rice+5kg",
        },
        {
          name_en: "Onion",
          name_bn: "পেঁয়াজ",
          is_packed: false,
          unit_type: "KG",
          base_price: 70,
          stock_quantity: 80,
          image_url: "https://via.placeholder.com/300?text=Onion",
        },
        {
          name_en: "Sugar 1kg Pack",
          name_bn: "চিনি ১ কেজি প্যাক",
          is_packed: true,
          unit_type: "Pack",
          base_price: 120,
          stock_quantity: 60,
          image_url: "https://via.placeholder.com/300?text=Sugar+1kg",
        },
      ]);
      console.log("✅ Seeded products collection");
    }

    // Seed sample customers if empty
    const custCount = await customersCol.countDocuments();
    if (custCount === 0) {
      await customersCol.insertMany([
        { name: "Mr. Rahim", phone: "01700000001", total_due: 0 },
        { name: "Mrs. Akter", phone: "01700000002", total_due: 150.5 },
      ]);
      console.log("✅ Seeded customers collection");
    }
  } catch (err) {
    console.error("❌ MongoDB connection/seed error:", err);
    process.exit(1);
  }
}
connectDBAndSeed();

// -----------------------------
// Helper: safe ObjectId
// -----------------------------
function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// -----------------------------
// Theme endpoint (frontend uses CSS variables but this is optional)
// -----------------------------
app.get("/api/theme", (req, res) => {
  res.json({
    text: "#0e1a05",
    background: "#e8f0e0",
    primary: "#8bd832",
    secondary: "#99b2d0",
    accent: "#67c2e2",
  });
});

// -----------------------------
// Products
// -----------------------------
app.get("/api/products", async (req, res) => {
  try {
    const products = await productsCol.find().toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/products/sellable", async (req, res) => {
  try {
    const list = await productsCol
      .find({ stock_quantity: { $gt: 0 } })
      .toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid product id" });
    const product = await productsCol.findOne({ _id: id });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const body = req.body;
    const result = await productsCol.insertOne(body);
    res.json({ message: "Product created", _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid product id" });
    const updated = await productsCol.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      { returnDocument: "after" }
    );
    res.json(updated.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid product id" });
    await productsCol.deleteOne({ _id: id });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -----------------------------
// Customers
// -----------------------------
app.get("/api/customers", async (req, res) => {
  try {
    const customers = await customersCol.find().toArray();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/customers/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer id" });
    const customer = await customersCol.findOne({ _id: id });
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/customers/unpaid", async (req, res) => {
  try {
    const list = await customersCol.find({ total_due: { $gt: 0 } }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const payload = { ...req.body, total_due: Number(req.body.total_due || 0) };
    const r = await customersCol.insertOne(payload);
    res.json({ message: "Customer created", _id: r.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer id" });
    const updated = await customersCol.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      { returnDocument: "after" }
    );
    res.json(updated.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update only due (keeps compatibility)
app.put("/api/customers/:id/update-due", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer id" });
    const { new_due } = req.body;
    const updated = await customersCol.findOneAndUpdate(
      { _id: id },
      { $set: { total_due: Number(new_due || 0) } },
      { returnDocument: "after" }
    );
    res.json(updated.value);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer id" });
    await customersCol.deleteOne({ _id: id });
    res.json({ message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -----------------------------
// Sales & Sell
// -----------------------------
// Generic sales listing (full history)
app.get("/api/sales", async (req, res) => {
  try {
    const list = await salesCol.find().sort({ sale_time: -1 }).toArray();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single sale detail with items
app.get("/api/sales/:id", async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid sale id" });

    const sale = await salesCol.findOne({ _id: id });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // fetch items
    const items = await saleItemsCol.find({ sale_id: id }).toArray();

    res.json({
      ...sale,
      items,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create sale (older endpoint used by some frontends)
app.post("/api/sales", async (req, res) => {
  try {
    const { items, total_amount, total_paid, payment_status, customerId } =
      req.body;

    const saleDoc = {
      sale_time: new Date(),
      total_amount: Number(total_amount || 0),
      total_paid: Number(total_paid || 0),
      payment_status: payment_status || "Paid",
      customer_id: customerId ? toObjectId(customerId) : null,
    };

    const saleRes = await salesCol.insertOne(saleDoc);

    for (const it of items) {
      await saleItemsCol.insertOne({
        sale_id: saleRes.insertedId,
        product_id: toObjectId(it.productId),
        quantity_sold: Number(it.quantity_sold),
        unit_price_at_sale: Number(it.unit_price_at_sale),
        final_line_price: Number(it.final_line_price),
      });

      // decrease stock
      if (it.productId) {
        await productsCol.updateOne(
          { _id: toObjectId(it.productId) },
          { $inc: { stock_quantity: -Number(it.quantity_sold) } }
        );
      }
    }

    // update due if needed
    if (saleDoc.payment_status !== "Paid" && saleDoc.customer_id) {
      const due = saleDoc.total_amount - saleDoc.total_paid;
      await customersCol.updateOne(
        { _id: saleDoc.customer_id },
        { $inc: { total_due: due } }
      );
    }

    res.json({ message: "Sale recorded", sale_id: saleRes.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get Daily Sales Summary
app.get("/api/sales/summary", async (req, res) => {
  try {
    const summary = await salesCol
      .aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$sale_time" },
            },
            totalAmount: { $sum: "$total_amount" },
            totalPaid: { $sum: "$total_paid" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ])
      .toArray();

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get All Sales from a Specific Day
app.get("/api/sales/by-date/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const list = await salesCol
      .aggregate([
        {
          $match: {
            sale_time: { $gte: start, $lt: end },
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        { $sort: { sale_time: -1 } },
      ])
      .toArray();

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Single Sale Details (Full A–Z Info)
app.get("/api/sales/details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await salesCol.findOne({ _id: new ObjectId(id) });

    const items = await saleItemsCol
      .aggregate([
        {
          $match: { sale_id: new ObjectId(id) },
        },
        {
          $lookup: {
            from: "products",
            localField: "product_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
      ])
      .toArray();

    const customer = sale.customer_id
      ? await customersCol.findOne({ _id: sale.customer_id })
      : null;

    res.json({ sale, items, customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// New Sell flow (Create sale + customer auto-create + due handling)
app.post("/api/sell", async (req, res) => {
  try {
    // expected: { cart, customer, paymentType, total }
    const {
      cart = [],
      customer = {},
      paymentType = "paid",
      total = 0,
    } = req.body;

    let customerId = null;
    // If half or due, create customer (or you could accept existing customer._id)
    if (customer && customer._id) {
      customerId = toObjectId(customer._id);
    } else if (paymentType === "half" || paymentType === "due") {
      const cdoc = {
        name: customer.name || "Unknown",
        phone: customer.number || "",
        total_due: 0,
      };
      const cres = await customersCol.insertOne(cdoc);
      customerId = cres.insertedId;
    }

    // calculate total_paid based on paymentType
    let total_paid = 0;
    if (paymentType === "paid") total_paid = Number(total);
    if (paymentType === "half") total_paid = Number(customer.halfAmount || 0);
    if (paymentType === "due") total_paid = 0;

    const payment_status =
      paymentType === "paid"
        ? "Paid"
        : paymentType === "half"
        ? "Half Paid"
        : "Unpaid";

    const saleDoc = {
      sale_time: new Date(),
      total_amount: Number(total),
      total_paid: Number(total_paid),
      payment_status,
      customer_id: customerId,
    };

    const saleRes = await salesCol.insertOne(saleDoc);

    for (const it of cart) {
      const productId = toObjectId(it._id);
      await saleItemsCol.insertOne({
        sale_id: saleRes.insertedId,
        product_id: productId,
        quantity_sold: Number(it.quantity || 0),
        unit: it.unit || it.unit_type || "KG",
        unit_price_at_sale: Number(it.employeePrice || it.base_price || 0),
        final_line_price: Number(
          it.total || it.quantity * (it.employeePrice || it.base_price || 0)
        ),
      });

      if (productId) {
        await productsCol.updateOne(
          { _id: productId },
          { $inc: { stock_quantity: -Number(it.quantity || 0) } }
        );
      }
    }

    // update customer's due
    if (paymentType !== "paid" && customerId) {
      const due = Number(total) - Number(total_paid || 0);
      await customersCol.updateOne(
        { _id: customerId },
        { $inc: { total_due: due } }
      );
    }

    res.json({
      message: "Sell recorded",
      sale_id: saleRes.insertedId,
      customer_id: customerId,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/api/products/sellable", async (req, res) => {
  try {
    const products = await productsCol
      .find({
        stock_quantity: { $gt: 0 },
        sellable: { $ne: false }, // anything except false
      })
      .sort({ name: 1 })
      .toArray();

    res.json(products);
  } catch (err) {
    console.error("Sellable product fetch error:", err);
    res.status(500).json({ message: "Failed to load sellable products" });
  }
});

// -----------------------------
// Dashboards
// -----------------------------
app.get("/api/dashboard/owner", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await salesCol
      .find({ sale_time: { $gte: today } })
      .toArray();

    // Optionally enrich with employee info or sale items if needed
    res.json({
      todaySales,
      totalCashIn: todaySales.reduce((s, x) => s + (x.total_paid || 0), 0),
      totalDue: todaySales.reduce(
        (s, x) => s + ((x.total_amount || 0) - (x.total_paid || 0)),
        0
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/dashboard/employee", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await salesCol
      .find({ sale_time: { $gte: today } })
      .sort({ sale_time: -1 })
      .toArray();
    const unpaidCustomers = await customersCol
      .find({ total_due: { $gt: 0 } })
      .toArray();
    res.json({ todaySales, unpaidCustomers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -----------------------------
// Root
// -----------------------------
app.get("/", (req, res) => res.send("✅ Store management server is running"));

// -----------------------------
// Start
// -----------------------------
app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
);

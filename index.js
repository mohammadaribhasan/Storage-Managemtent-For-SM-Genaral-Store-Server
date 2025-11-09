// server.js
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());

// 🎨 UI Theme Colors
const theme = {
  text: "#0e1a05",
  background: "#e8f0e0",
  primary: "#8bd832",
  secondary: "#99b2d0",
  accent: "#67c2e2",
};

// 🌿 MongoDB Connection
const uri =
  "mongodb+srv://mdaribhasanpc_db_user:Nw64BPOZiDZnQfns@smstore.i8egyps.mongodb.net/?appName=SMStore";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let db, productsCol, customersCol, salesCol, saleItemsCol;

async function connectDB() {
  await client.connect();
  db = client.db("SMStore");
  productsCol = db.collection("products");
  customersCol = db.collection("customers");
  salesCol = db.collection("sales");
  saleItemsCol = db.collection("saleItems");
  console.log("✅ MongoDB Connected");

  // 🧩 Seed fake data if empty
  const count = await productsCol.countDocuments();
  if (count === 0) {
    await productsCol.insertMany([
      {
        name_en: "Potato",
        name_bn: "আলু",
        is_packed: false,
        unit_type: "KG",
        base_price: 35,
        stock_quantity: 100,
        image_url: "https://via.placeholder.com/100?text=Potato",
      },
      {
        name_en: "Rice 5kg Pack",
        name_bn: "চাল ৫ কেজি প্যাক",
        is_packed: true,
        unit_type: "Pack",
        base_price: 480,
        stock_quantity: 50,
        image_url: "https://via.placeholder.com/100?text=Rice",
      },
      {
        name_en: "Onion",
        name_bn: "পেঁয়াজ",
        is_packed: false,
        unit_type: "KG",
        base_price: 70,
        stock_quantity: 80,
        image_url: "https://via.placeholder.com/100?text=Onion",
      },
      {
        name_en: "Sugar 1kg Pack",
        name_bn: "চিনি ১ কেজি প্যাক",
        is_packed: true,
        unit_type: "Pack",
        base_price: 120,
        stock_quantity: 60,
        image_url: "https://via.placeholder.com/100?text=Sugar",
      },
    ]);
    console.log("✅ Seeded sample products");
  }
}
connectDB();

/* =============================
   🌐 ROUTES
============================= */

// 🎨 Theme API
app.get("/api/theme", (req, res) => res.json(theme));

// 🧺 Products
app.get("/api/products", async (req, res) => {
  const products = await productsCol.find().toArray();
  res.json(products);
});

app.get("/api/products/sellable", async (req, res) => {
  const list = await productsCol.find({ stock_quantity: { $gt: 0 } }).toArray();
  res.json(list);
});

app.post("/api/products", async (req, res) => {
  const product = req.body;
  await productsCol.insertOne(product);
  res.json({ message: "Product added", product });
});

app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const updated = await productsCol.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: req.body },
    { returnDocument: "after" }
  );
  res.json(updated.value);
});

// 💰 Sales
app.post("/api/sales", async (req, res) => {
  try {
    const { items, total_amount, total_paid, payment_status, customerId } =
      req.body;

    const sale = {
      sale_time: new Date(),
      total_amount,
      total_paid,
      payment_status,
      customer_id: customerId ? new ObjectId(customerId) : null,
    };
    const saleRes = await salesCol.insertOne(sale);

    for (const item of items) {
      await saleItemsCol.insertOne({
        sale_id: saleRes.insertedId,
        product_id: new ObjectId(item.productId),
        quantity_sold: item.quantity_sold,
        unit_price_at_sale: item.unit_price_at_sale,
        final_line_price: item.final_line_price,
      });

      await productsCol.updateOne(
        { _id: new ObjectId(item.productId) },
        { $inc: { stock_quantity: -item.quantity_sold } }
      );
    }

    if (payment_status !== "Paid" && customerId) {
      const due = total_amount - total_paid;
      await customersCol.updateOne(
        { _id: new ObjectId(customerId) },
        { $inc: { total_due: due } }
      );
    }

    res.json({ message: "Sale recorded", sale_id: saleRes.insertedId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 👥 Customers
app.get("/api/customers/unpaid", async (req, res) => {
  const list = await customersCol.find({ total_due: { $gt: 0 } }).toArray();
  res.json(list);
});

app.post("/api/customers", async (req, res) => {
  const customer = { ...req.body, total_due: req.body.total_due || 0 };
  const result = await customersCol.insertOne(customer);
  res.json({ ...customer, _id: result.insertedId });
});

app.put("/api/customers/:id/update-due", async (req, res) => {
  const { id } = req.params;
  const { new_due } = req.body;
  const updated = await customersCol.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { total_due: new_due } },
    { returnDocument: "after" }
  );
  res.json(updated.value);
});

// 📊 Dashboard — Owner
app.get("/api/dashboard/owner", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = await salesCol
    .find({ sale_time: { $gte: today } })
    .toArray();
  const totalCashIn = todaySales.reduce((s, x) => s + (x.total_paid || 0), 0);
  const totalDue = todaySales.reduce(
    (s, x) => s + ((x.total_amount || 0) - (x.total_paid || 0)),
    0
  );

  res.json({ todaySales, totalCashIn, totalDue });
});

// 📊 Dashboard — Employee
app.get("/api/dashboard/employee", async (req, res) => {
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
});

// ✅ Root
app.get("/", (req, res) => res.send("✅ POS Inventory System API running!"));

// 🚀 Server Start
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);

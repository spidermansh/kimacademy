// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config();
var app = express();
var PORT = process.env.PORT || 3001;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.join(__dirname, "data");
var TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
var USERS_FILE = path.join(DATA_DIR, "users.json");
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.static(path.join(__dirname, "dist")));
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
var DEFAULT_USERS = [
  { id: "1", username: "ketoan", password: "password123", name: "Nguy\u1EC5n K\u1EBF To\xE1n", role: "admin" },
  { id: "2", username: "nvvp", password: "password123", name: "Nguy\u1EC5n Minh Anh", role: "staff" },
  { id: "3", username: "admin", password: "password123", name: "Qu\u1EA3n Tr\u1ECB Vi\xEAn", role: "admin" }
];
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), "utf-8");
} else {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    const users = JSON.parse(data);
    if (!users.some((u) => u.username === "admin")) {
      users.push({ id: "3", username: "admin", password: "password123", name: "Qu\u1EA3n Tr\u1ECB Vi\xEAn", role: "admin" });
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    }
  } catch (error) {
    console.error("Error during users.json migration:", error);
  }
}
if (!fs.existsSync(TRANSACTIONS_FILE)) {
  fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2), "utf-8");
}
var sessions = /* @__PURE__ */ new Map();
function getTransactions() {
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading transactions file:", error);
    return [];
  }
}
function saveTransactions(transactions) {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing transactions file:", error);
    return false;
  }
}
function getUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users file:", error);
    return DEFAULT_USERS;
  }
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Kh\xF4ng t\xECm th\u1EA5y token x\xE1c th\u1EF1c" });
  }
  const session = sessions.get(token);
  if (!session) {
    return res.status(403).json({ message: "Token kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n" });
  }
  req.user = session;
  next();
}
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u" });
  }
  const users = getUsers();
  const user = users.find((u) => u.username === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c" });
  }
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  sessions.set(token, { username: user.username, role: user.role, name: user.name });
  res.json({
    token,
    user: {
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    sessions.delete(token);
  }
  res.json({ message: "\u0110\u0103ng xu\u1EA5t th\xE0nh c\xF4ng" });
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
app.get("/api/users", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const users = getUsers();
  res.json(users);
});
app.post("/api/users", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin" });
  }
  const users = getUsers();
  if (users.some((u) => u.username === username.toLowerCase())) {
    return res.status(400).json({ message: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
  }
  const newUser = {
    id: Math.random().toString(36).substring(2, 9),
    username: username.toLowerCase(),
    password,
    name,
    role
  };
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  res.status(201).json(newUser);
});
app.put("/api/users/:id", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const { username, password, name, role } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
  }
  if (username && username.toLowerCase() !== users[userIndex].username) {
    if (users.some((u) => u.username === username.toLowerCase())) {
      return res.status(400).json({ message: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
    }
    users[userIndex].username = username.toLowerCase();
  }
  if (password) users[userIndex].password = password;
  if (name) users[userIndex].name = name;
  if (role) users[userIndex].role = role;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  res.json(users[userIndex]);
});
app.delete("/api/users/:id", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const users = getUsers();
  const userToDelete = users.find((u) => u.id === id);
  if (!userToDelete) {
    return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
  }
  if (userToDelete.username === req.user.username) {
    return res.status(400).json({ message: "Kh\xF4ng th\u1EC3 t\u1EF1 x\xF3a t\xE0i kho\u1EA3n c\u1EE7a ch\xEDnh m\xECnh!" });
  }
  const filtered = users.filter((u) => u.id !== id);
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  res.json({ success: true, message: "X\xF3a ng\u01B0\u1EDDi d\xF9ng th\xE0nh c\xF4ng" });
});
app.get("/api/transactions", authenticateToken, (req, res) => {
  const list = getTransactions();
  res.json(list);
});
app.post("/api/transactions", authenticateToken, (req, res) => {
  const data = req.body;
  const list = getTransactions();
  const newTx = {
    ...data,
    id: data.id || Math.random().toString(36).substring(2, 9),
    createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    isReconciled: false,
    isInvoiced: false
  };
  list.push(newTx);
  if (saveTransactions(list)) {
    res.status(201).json(newTx);
  } else {
    res.status(500).json({ message: "Kh\xF4ng th\u1EC3 ghi d\u1EEF li\u1EC7u" });
  }
});
app.delete("/api/transactions/:id", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const list = getTransactions();
  const filtered = list.filter((t) => t.id !== id);
  if (list.length === filtered.length) {
    return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
  }
  if (saveTransactions(filtered)) {
    res.json({ success: true, message: "X\xF3a giao d\u1ECBch th\xE0nh c\xF4ng" });
  } else {
    res.status(500).json({ message: "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u" });
  }
});
app.patch("/api/transactions/:id/reconcile", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { isReconciled } = req.body;
  if (typeof isReconciled !== "boolean") {
    return res.status(400).json({ message: "D\u1EEF li\u1EC7u isReconciled kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  const list = getTransactions();
  const txIndex = list.findIndex((t) => t.id === id);
  if (txIndex === -1) {
    return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
  }
  list[txIndex].isReconciled = isReconciled;
  if (saveTransactions(list)) {
    res.json(list[txIndex]);
  } else {
    res.status(500).json({ message: "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u" });
  }
});
app.patch("/api/transactions/:id/invoice", authenticateToken, (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const { isInvoiced } = req.body;
  if (typeof isInvoiced !== "boolean") {
    return res.status(400).json({ message: "D\u1EEF li\u1EC7u isInvoiced kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  const list = getTransactions();
  const txIndex = list.findIndex((t) => t.id === id);
  if (txIndex === -1) {
    return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
  }
  list[txIndex].isInvoiced = isInvoiced;
  if (saveTransactions(list)) {
    res.json(list[txIndex]);
  } else {
    res.status(500).json({ message: "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u" });
  }
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

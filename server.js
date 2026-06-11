// server.ts
import express from "express";
import path2 from "path";
import dotenv2 from "dotenv";
import { fileURLToPath as fileURLToPath2 } from "url";

// db.ts
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.join(__dirname, "data");
var TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
var USERS_FILE = path.join(DATA_DIR, "users.json");
var STUDENTS_FILE = path.join(DATA_DIR, "students.json");
var CLASSES_FILE = path.join(DATA_DIR, "classes.json");
var ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");
var ENROLLMENTS_FILE = path.join(DATA_DIR, "enrollments.json");
var SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
var STAFF_FILE = path.join(DATA_DIR, "staff.json");
var TEACHING_LOGS_FILE = path.join(DATA_DIR, "teaching_logs.json");
var SALARY_ADVANCES_FILE = path.join(DATA_DIR, "salary_advances.json");
var MONTHLY_SALARIES_FILE = path.join(DATA_DIR, "monthly_salaries.json");
var DEFAULT_SETTINGS = {
  centerName: "Kim Academy",
  logoUrl: "",
  phone: "",
  address: "",
  feeTypes: [
    "H\u1ECDc ph\xED offline",
    "H\u1ECDc ph\xED online",
    "S\xE1ch",
    "\u0110\u1ED3ng ph\u1EE5c",
    "L\u1EC7 ph\xED thi",
    "Thu kh\xE1c"
  ],
  paymentMethods: [
    "Chuy\u1EC3n kho\u1EA3n",
    "Ti\u1EC1n m\u1EB7t",
    "Momo",
    "ZaloPay",
    "Kh\xE1c"
  ],
  expenseCategories: [
    "M\u1EB7t b\u1EB1ng",
    "\u0110i\u1EC7n n\u01B0\u1EDBc",
    "Internet",
    "D\u1EE5ng c\u1EE5 h\u1ECDc t\u1EADp",
    "Marketing/Qu\u1EA3ng c\xE1o",
    "B\u1EA3o tr\xEC/S\u1EEDa ch\u1EEFa",
    "\u0110\u1ED1i ngo\u1EA1i",
    "V\u0103n ph\xF2ng ph\u1EA9m",
    "Qu\u1EF9 ho\u1EA1t \u0111\u1ED9ng",
    "Chi kh\xE1c"
  ]
};
var DEFAULT_USERS = [
  { id: "1", username: "ketoan", password: "password123", name: "Nguy\u1EC5n K\u1EBF To\xE1n", role: "admin" },
  { id: "2", username: "nvvp", password: "password123", name: "Nguy\u1EC5n Minh Anh", role: "staff" },
  { id: "3", username: "admin", password: "password123", name: "Qu\u1EA3n Tr\u1ECB Vi\xEAn", role: "admin" }
];
var DatabaseService = class {
  constructor() {
    this.isCloud = false;
    this.mongoClient = null;
    this.dbName = "kim_academy";
    // ─── Expense Management (Quản lý Chi phí) ──────────────────────────────────
    this.EXPENSES_FILE = path.join(DATA_DIR, "expenses.json");
    // ─── Audit Logs ─────────────────────────────────────────────────────────────
    this.AUDIT_LOG_FILE = path.join(DATA_DIR, "audit_logs.json");
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      this.isCloud = true;
      this.mongoClient = new MongoClient(mongoUri, {
        tls: true,
        serverSelectionTimeoutMS: 15e3,
        connectTimeoutMS: 15e3,
        socketTimeoutMS: 45e3,
        retryWrites: true,
        retryReads: true
      });
      const match = mongoUri.match(/\/([^/?]+)(\?|$)/);
      if (match && match[1]) {
        this.dbName = match[1];
      }
    }
  }
  async init() {
    if (this.isCloud && this.mongoClient) {
      try {
        console.log("\u{1F50C} Connecting to MongoDB Atlas cloud database...");
        console.log(`   Database: ${this.dbName}`);
        await this.mongoClient.connect();
        console.log("\u2705 Connected to MongoDB Atlas successfully.");
        const db2 = this.mongoClient.db(this.dbName);
        const usersCol = db2.collection("users");
        const count = await usersCol.countDocuments();
        if (count === 0) {
          console.log("\u{1F331} Seeding default users into MongoDB Atlas...");
          await usersCol.insertMany(DEFAULT_USERS);
        } else {
          const adminExists = await usersCol.findOne({ username: "admin" });
          if (!adminExists) {
            console.log("\u{1F331} Migrating admin user into MongoDB Atlas...");
            await usersCol.insertOne({ id: "3", username: "admin", password: "password123", name: "Qu\u1EA3n Tr\u1ECB Vi\xEAn", role: "admin" });
          }
        }
      } catch (error) {
        console.error("\u274C Failed to connect to MongoDB Atlas, falling back to local files:", error);
        this.isCloud = false;
        this.initLocalFiles();
      }
    } else {
      this.initLocalFiles();
    }
  }
  initLocalFiles() {
    console.log("\u{1F4C1} Using local JSON file-based database...");
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
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
    if (!fs.existsSync(STUDENTS_FILE)) {
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(CLASSES_FILE)) {
      fs.writeFileSync(CLASSES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(ATTENDANCE_FILE)) {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(ENROLLMENTS_FILE)) {
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
    }
    if (!fs.existsSync(STAFF_FILE)) {
      fs.writeFileSync(STAFF_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(TEACHING_LOGS_FILE)) {
      fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(SALARY_ADVANCES_FILE)) {
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
    if (!fs.existsSync(MONTHLY_SALARIES_FILE)) {
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  }
  // ─── Transactions ────────────────────────────────────────────────────────────
  async getTransactions() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const list = await db2.collection("transactions").find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(TRANSACTIONS_FILE, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        console.error("Error reading transactions file:", error);
        return [];
      }
    }
  }
  async createTransaction(tx) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const newTx = { ...tx };
      await db2.collection("transactions").insertOne(newTx);
      const { _id, ...rest } = newTx;
      return rest;
    } else {
      const list = await this.getTransactions();
      list.push(tx);
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return tx;
    }
  }
  async deleteTransaction(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const res = await db2.collection("transactions").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getTransactions();
      const filtered = list.filter((t) => t.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  async updateTransaction(id, updates, editedBy) {
    const allowedFields = [
      "paymentDate",
      "studentName",
      "className",
      "term",
      "amount",
      "paymentMethod",
      "revenueCategory",
      "senderName",
      "notes",
      "isReconciled",
      "isInvoiced"
    ];
    let existing = null;
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      existing = await db2.collection("transactions").findOne({ id });
    } else {
      const list = await this.getTransactions();
      existing = list.find((t) => t.id === id);
    }
    if (!existing) return null;
    const sanitized = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    for (const key of allowedFields) {
      if (updates[key] !== void 0) {
        sanitized[key] = updates[key];
      }
    }
    const changes = [];
    for (const key of allowedFields) {
      if (updates[key] !== void 0 && updates[key] !== existing[key]) {
        changes.push({
          field: key,
          oldValue: existing[key],
          newValue: updates[key]
        });
      }
    }
    if (changes.length > 0 && editedBy) {
      const logEntry = {
        editedBy,
        editedAt: (/* @__PURE__ */ new Date()).toISOString(),
        changes
      };
      sanitized.editHistory = [...existing.editHistory || [], logEntry];
    }
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("transactions").updateOne({ id }, { $set: sanitized });
      const updated = await db2.collection("transactions").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...sanitized };
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  async updateTransactionReconciled(id, isReconciled) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("transactions").updateOne({ id }, { $set: { isReconciled } });
      const updated = await db2.collection("transactions").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return null;
      list[index].isReconciled = isReconciled;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  async updateTransactionInvoiced(id, isInvoiced) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("transactions").updateOne({ id }, { $set: { isInvoiced } });
      const updated = await db2.collection("transactions").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return null;
      list[index].isInvoiced = isInvoiced;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  // ─── Users ───────────────────────────────────────────────────────────────────
  async getUsers() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const list = await db2.collection("users").find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        console.error("Error reading users file:", error);
        return DEFAULT_USERS;
      }
    }
  }
  async createUser(user) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const newUser = { ...user };
      await db2.collection("users").insertOne(newUser);
      const { _id, ...rest } = newUser;
      return rest;
    } else {
      const list = await this.getUsers();
      list.push(user);
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return user;
    }
  }
  async updateUser(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("users").updateOne({ id }, { $set: updates });
      const updated = await db2.collection("users").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getUsers();
      const index = list.findIndex((u) => u.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates };
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  async deleteUser(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const res = await db2.collection("users").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getUsers();
      const filtered = list.filter((u) => u.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  // ─── Students ────────────────────────────────────────────────────────────────
  async getStudents() {
    let rawList = [];
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const list = await db2.collection("students").find({}).toArray();
      rawList = list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(STUDENTS_FILE)) {
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), "utf-8");
        }
        const data = fs.readFileSync(STUDENTS_FILE, "utf-8");
        rawList = JSON.parse(data);
      } catch (error) {
        console.error("Error reading students file:", error);
        rawList = [];
      }
    }
    return rawList.map((s) => ({
      ...s,
      status: s.status || "active",
      enrollDate: s.enrollDate || s.createdAt?.slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      parentEmail: s.parentEmail || "",
      address: s.address || "",
      notes: s.notes || ""
    }));
  }
  async upsertStudent(studentName, className) {
    const normalizedName = studentName.trim();
    if (!normalizedName) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const defaults = {
      status: "active",
      enrollDate: now.slice(0, 10),
      parentEmail: "",
      address: "",
      notes: ""
    };
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const col = db2.collection("students");
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, "i") } });
      if (existing) {
        await col.updateOne({ id: existing.id }, { $set: { className, updatedAt: now } });
        return { ...existing, className };
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || "",
          feePerSession: 0,
          ...defaults,
          createdAt: now,
          updatedAt: now
        };
        await col.insertOne(newStudent);
        return newStudent;
      }
    } else {
      const list = await this.getStudents();
      const existingIndex = list.findIndex((s) => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existingIndex > -1) {
        list[existingIndex].className = className || "";
        list[existingIndex].updatedAt = now;
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
        return list[existingIndex];
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || "",
          feePerSession: 0,
          ...defaults,
          createdAt: now,
          updatedAt: now
        };
        list.push(newStudent);
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
        return newStudent;
      }
    }
  }
  async createStudent(student) {
    const normalizedName = student.name.trim();
    if (!normalizedName) return null;
    const newStudent = {
      id: student.id || Math.random().toString(36).substring(2, 9),
      name: normalizedName,
      vietnameseName: student.vietnameseName || "",
      englishName: student.englishName || "",
      vietAnhName: student.vietAnhName || "",
      className: student.className || "",
      gender: student.gender || "",
      birthYear: student.birthYear ? Number(student.birthYear) : 0,
      parentPhone: student.parentPhone || "",
      feePerSession: student.feePerSession ? Number(student.feePerSession) : 0,
      status: student.status || "active",
      enrollDate: student.enrollDate || student.createdAt?.slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      parentEmail: student.parentEmail || "",
      address: student.address || "",
      notes: student.notes || "",
      createdAt: student.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const col = db2.collection("students");
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, "i") } });
      if (existing) {
        const updatedFields = { ...newStudent };
        delete updatedFields.id;
        delete updatedFields.createdAt;
        await col.updateOne({ id: existing.id }, { $set: updatedFields });
        return { ...existing, ...updatedFields };
      }
      await col.insertOne(newStudent);
      const { _id, ...rest } = newStudent;
      return rest;
    } else {
      const list = await this.getStudents();
      const existingIndex = list.findIndex((s) => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existingIndex > -1) {
        list[existingIndex] = {
          ...list[existingIndex],
          ...newStudent,
          id: list[existingIndex].id,
          createdAt: list[existingIndex].createdAt
        };
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
        return list[existingIndex];
      } else {
        list.push(newStudent);
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
        return newStudent;
      }
    }
  }
  async updateStudent(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const updateData = { ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db2.collection("students").updateOne({ id }, { $set: updateData });
      const updated = await db2.collection("students").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getStudents();
      const index = list.findIndex((s) => s.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  async deleteStudent(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const res = await db2.collection("students").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getStudents();
      const filtered = list.filter((s) => s.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  // ─── Classes ─────────────────────────────────────────────────────────────────
  async getClasses() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const list = await db2.collection("classes").find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(CLASSES_FILE)) {
          fs.writeFileSync(CLASSES_FILE, JSON.stringify([], null, 2), "utf-8");
        }
        const data = fs.readFileSync(CLASSES_FILE, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        console.error("Error reading classes file:", error);
        return [];
      }
    }
  }
  async createClass(cls) {
    const newClass = {
      id: cls.id || Math.random().toString(36).substring(2, 9),
      name: cls.name,
      type: cls.type || "offline",
      schedule: cls.schedule || "",
      teacher: cls.teacher || "",
      description: cls.description || "",
      room: cls.room || "",
      maxStudents: Number(cls.maxStudents) || 0,
      status: cls.status || "active",
      defaultFee: Number(cls.defaultFee) || 0,
      scheduleDays: cls.scheduleDays || [],
      scheduleTime: cls.scheduleTime || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("classes").insertOne(newClass);
      const { _id, ...rest } = newClass;
      return rest;
    } else {
      const list = await this.getClasses();
      list.push(newClass);
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return newClass;
    }
  }
  async updateClass(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const updateData = { ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db2.collection("classes").updateOne({ id }, { $set: updateData });
      const updated = await db2.collection("classes").findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getClasses();
      const index = list.findIndex((c) => c.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[index];
    }
  }
  async deleteClass(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const res = await db2.collection("classes").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getClasses();
      const filtered = list.filter((c) => c.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  // ─── Attendance ──────────────────────────────────────────────────────────────
  async getAttendance(filters) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const query = {};
      if (filters?.date) query.date = filters.date;
      if (filters?.classId) query.classId = filters.classId;
      if (filters?.studentId) query.studentId = filters.studentId;
      const list = await db2.collection("attendance").find(query).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(ATTENDANCE_FILE)) {
          fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2), "utf-8");
        }
        const data = fs.readFileSync(ATTENDANCE_FILE, "utf-8");
        let list = JSON.parse(data);
        if (filters?.date) list = list.filter((a) => a.date === filters.date);
        if (filters?.classId) list = list.filter((a) => a.classId === filters.classId);
        if (filters?.studentId) list = list.filter((a) => a.studentId === filters.studentId);
        return list;
      } catch (error) {
        console.error("Error reading attendance file:", error);
        return [];
      }
    }
  }
  async createAttendanceBatch(records) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newRecords = records.map((r) => ({
      id: r.id || Math.random().toString(36).substring(2, 9),
      date: r.date,
      classId: r.classId,
      className: r.className,
      studentId: r.studentId,
      studentName: r.studentName,
      status: r.status,
      // present | absent | excused
      sessionsDeducted: r.status === "excused" ? 0 : 1,
      // vắng có phép không trừ
      note: r.note || "",
      // Ghi chú lý do vắng
      createdAt: now
    }));
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      if (newRecords.length > 0) {
        await db2.collection("attendance").deleteMany({
          date: newRecords[0].date,
          classId: newRecords[0].classId
        });
        await db2.collection("attendance").insertMany(newRecords);
      }
      return newRecords;
    } else {
      let list = await this.getAttendance();
      if (newRecords.length > 0) {
        list = list.filter((a) => !(a.date === newRecords[0].date && a.classId === newRecords[0].classId));
        list.push(...newRecords);
        fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(list, null, 2), "utf-8");
      }
      return newRecords;
    }
  }
  async deleteAttendance(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const res = await db2.collection("attendance").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getAttendance();
      const filtered = list.filter((a) => a.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  // ─── Enrollments (Class Transfer History) ────────────────────────────────────
  async getEnrollments(filters) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const query = {};
      if (filters?.studentId) query.studentId = filters.studentId;
      if (filters?.className) query.className = filters.className;
      if (filters?.isActive !== void 0) query.isActive = filters.isActive;
      const list = await db2.collection("enrollments").find(query).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(ENROLLMENTS_FILE)) {
          fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
        }
        const data = fs.readFileSync(ENROLLMENTS_FILE, "utf-8");
        let list = JSON.parse(data);
        if (filters?.studentId) list = list.filter((e) => e.studentId === filters.studentId);
        if (filters?.className) list = list.filter((e) => e.className === filters.className);
        if (filters?.isActive !== void 0) list = list.filter((e) => e.isActive === filters.isActive);
        return list;
      } catch (error) {
        console.error("Error reading enrollments file:", error);
        return [];
      }
    }
  }
  async createEnrollment(enrollment) {
    const newEnrollment = {
      id: enrollment.id || Math.random().toString(36).substring(2, 9),
      studentId: enrollment.studentId,
      studentName: enrollment.studentName,
      className: enrollment.className,
      feePerSession: Number(enrollment.feePerSession) || 0,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate || null,
      isActive: enrollment.isActive !== false,
      transferNote: enrollment.transferNote || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("enrollments").insertOne(newEnrollment);
      const { _id, ...rest } = newEnrollment;
      return rest;
    } else {
      const list = await this.getEnrollments();
      list.push(newEnrollment);
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return newEnrollment;
    }
  }
  /**
   * transferClass: Đóng enrollment cũ + mở enrollment mới + cập nhật student.className
   */
  async transferClass(payload) {
    const { studentId, studentName, newClassName, newFeePerSession, transferDate, transferNote } = payload;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("enrollments").updateMany(
        { studentId, isActive: true },
        { $set: { isActive: false, endDate: transferDate } }
      );
      const newEnrollment = {
        id: Math.random().toString(36).substring(2, 9),
        studentId,
        studentName,
        className: newClassName,
        feePerSession: newFeePerSession,
        startDate: transferDate,
        endDate: null,
        isActive: true,
        transferNote: transferNote || "",
        createdAt: now
      };
      await db2.collection("enrollments").insertOne(newEnrollment);
      await db2.collection("students").updateOne(
        { id: studentId },
        { $set: { className: newClassName, feePerSession: newFeePerSession, updatedAt: now } }
      );
      const student = await db2.collection("students").findOne({ id: studentId });
      const { _id: s_id, ...studentRest } = student || {};
      const { _id: e_id, ...enrollRest } = newEnrollment;
      return { oldEnrollment: null, newEnrollment: enrollRest, student: studentRest };
    } else {
      let enrollments = await this.getEnrollments();
      const closed = enrollments.filter((e) => e.studentId === studentId && e.isActive).map((e) => ({ ...e, isActive: false, endDate: transferDate }));
      enrollments = enrollments.map(
        (e) => e.studentId === studentId && e.isActive ? { ...e, isActive: false, endDate: transferDate } : e
      );
      const newEnrollment = {
        id: Math.random().toString(36).substring(2, 9),
        studentId,
        studentName,
        className: newClassName,
        feePerSession: newFeePerSession,
        startDate: transferDate,
        endDate: null,
        isActive: true,
        transferNote: transferNote || "",
        createdAt: now
      };
      enrollments.push(newEnrollment);
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2), "utf-8");
      const students = await this.getStudents();
      const idx = students.findIndex((s) => s.id === studentId);
      if (idx > -1) {
        students[idx] = { ...students[idx], className: newClassName, feePerSession: newFeePerSession, updatedAt: now };
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), "utf-8");
      }
      return { oldEnrollment: closed[0] || null, newEnrollment, student: students[idx] || null };
    }
  }
  // ─── Settings ────────────────────────────────────────────────────────────────────────────
  async getSettings() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const doc = await db2.collection("settings").findOne({ _type: "global" });
      if (doc) {
        const { _id, _type, ...rest } = doc;
        return rest;
      }
      await db2.collection("settings").insertOne({ _type: "global", ...DEFAULT_SETTINGS });
      return { ...DEFAULT_SETTINGS };
    } else {
      try {
        if (!fs.existsSync(SETTINGS_FILE)) {
          fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
        }
        const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        console.error("Error reading settings file:", error);
        return { ...DEFAULT_SETTINGS };
      }
    }
  }
  async updateSettings(updates) {
    const allowedKeys = ["centerName", "logoUrl", "phone", "address", "feeTypes", "paymentMethods"];
    const sanitized = {};
    for (const key of allowedKeys) {
      if (updates[key] !== void 0) {
        sanitized[key] = updates[key];
      }
    }
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("settings").updateOne(
        { _type: "global" },
        { $set: sanitized },
        { upsert: true }
      );
      const doc = await db2.collection("settings").findOne({ _type: "global" });
      if (doc) {
        const { _id, _type, ...rest } = doc;
        return rest;
      }
      return sanitized;
    } else {
      const current = await this.getSettings();
      const merged = { ...current, ...sanitized };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
      return merged;
    }
  }
  // ─── Cascade update student name in related collections ──────────────────────
  /**
   * Khi đổi tên học viên, cập nhật studentName trong:
   * - transactions (khớp theo studentId nếu có, hoặc theo tên cũ)
   * - attendance (khớp theo studentId)
   * - enrollments (khớp theo studentId)
   */
  async cascadeUpdateStudentName(studentId, oldName, newName) {
    let transactionsUpdated = 0;
    let attendanceUpdated = 0;
    let enrollmentsUpdated = 0;
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const txResult = await db2.collection("transactions").updateMany(
        {
          $or: [
            { studentId },
            { studentName: { $regex: new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }
          ]
        },
        { $set: { studentName: newName } }
      );
      transactionsUpdated = txResult.modifiedCount;
      const attResult = await db2.collection("attendance").updateMany(
        { studentId },
        { $set: { studentName: newName } }
      );
      attendanceUpdated = attResult.modifiedCount;
      const enrollResult = await db2.collection("enrollments").updateMany(
        { studentId },
        { $set: { studentName: newName } }
      );
      enrollmentsUpdated = enrollResult.modifiedCount;
    } else {
      const transactions = await this.getTransactions();
      let txChanged = false;
      const updatedTransactions = transactions.map((t) => {
        const nameMatch = t.studentName?.toLowerCase() === oldName.toLowerCase();
        const idMatch = t.studentId === studentId;
        if (nameMatch || idMatch) {
          transactionsUpdated++;
          txChanged = true;
          return { ...t, studentName: newName };
        }
        return t;
      });
      if (txChanged) {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(updatedTransactions, null, 2), "utf-8");
      }
      const allAttendance = await this.getAttendance();
      let attChanged = false;
      const updatedAttendance = allAttendance.map((a) => {
        if (a.studentId === studentId) {
          attendanceUpdated++;
          attChanged = true;
          return { ...a, studentName: newName };
        }
        return a;
      });
      if (attChanged) {
        fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(updatedAttendance, null, 2), "utf-8");
      }
      const allEnrollments = await this.getEnrollments();
      let enrollChanged = false;
      const updatedEnrollments = allEnrollments.map((e) => {
        if (e.studentId === studentId) {
          enrollmentsUpdated++;
          enrollChanged = true;
          return { ...e, studentName: newName };
        }
        return e;
      });
      if (enrollChanged) {
        fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(updatedEnrollments, null, 2), "utf-8");
      }
    }
    return { transactionsUpdated, attendanceUpdated, enrollmentsUpdated };
  }
  // ─── Notifications (Sprint 4.3) ────────────────────────────────────────────
  async getNotifications() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      return await db2.collection("notifications").find({}).sort({ createdAt: -1 }).toArray();
    } else {
      const file = path.join(DATA_DIR, "notifications.json");
      if (!fs.existsSync(file)) return [];
      try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch {
        return [];
      }
    }
  }
  async saveNotifications(notifications) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const col = db2.collection("notifications");
      await col.deleteMany({});
      if (notifications.length > 0) {
        await col.insertMany(notifications);
      }
    } else {
      const file = path.join(DATA_DIR, "notifications.json");
      fs.writeFileSync(file, JSON.stringify(notifications, null, 2), "utf-8");
    }
  }
  async addNotification(notification) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("notifications").insertOne(notification);
      return notification;
    } else {
      const all = await this.getNotifications();
      all.unshift(notification);
      await this.saveNotifications(all);
      return notification;
    }
  }
  async updateNotification(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      await db2.collection("notifications").updateOne({ id }, { $set: updates });
      return await db2.collection("notifications").findOne({ id });
    } else {
      const all = await this.getNotifications();
      const idx = all.findIndex((n) => n.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      await this.saveNotifications(all);
      return all[idx];
    }
  }
  async deleteNotification(id) {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const result = await db2.collection("notifications").deleteOne({ id });
      return result.deletedCount > 0;
    } else {
      const all = await this.getNotifications();
      const filtered = all.filter((n) => n.id !== id);
      if (filtered.length === all.length) return false;
      await this.saveNotifications(filtered);
      return true;
    }
  }
  async markAllNotificationsRead() {
    if (this.isCloud && this.mongoClient) {
      const db2 = this.mongoClient.db(this.dbName);
      const result = await db2.collection("notifications").updateMany({ isRead: false }, { $set: { isRead: true } });
      return result.modifiedCount;
    } else {
      const all = await this.getNotifications();
      let count = 0;
      all.forEach((n) => {
        if (!n.isRead) {
          n.isRead = true;
          count++;
        }
      });
      await this.saveNotifications(all);
      return count;
    }
  }
  /**
   * Generate smart notifications based on current system state.
   * Called on login or manually by user.
   */
  async generateNotifications() {
    const students = await this.getStudents();
    const attendance = await this.getAttendance();
    const transactions = await this.getTransactions();
    const classes = await this.getClasses();
    const existing = await this.getNotifications();
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayObj = /* @__PURE__ */ new Date();
    const dayOfWeek = todayObj.getDay();
    const genId = () => Math.random().toString(36).substring(2, 12);
    const newNotifs = [];
    const existsToday = (type, studentId) => existing.some(
      (n) => n.type === type && n.createdAt?.startsWith(today) && (!studentId || n.studentId === studentId)
    );
    for (const student of students) {
      if (!student.feePerSession || student.feePerSession <= 0) continue;
      if (student.status === "left") continue;
      const totalPaid = transactions.filter((t) => t.studentName?.toLowerCase() === student.name?.toLowerCase() && t.revenueCategory === "H\u1ECDc ph\xED offline").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const sessionsUsed = attendance.filter((a) => a.studentId === student.id && a.status !== "excused").length;
      const costUsed = sessionsUsed * student.feePerSession;
      const remaining = Math.floor((totalPaid - costUsed) / student.feePerSession);
      if (remaining <= 0 && !existsToday("fee_warning", student.id)) {
        newNotifs.push({
          id: genId(),
          type: "fee_warning",
          title: `${student.name} \u0111\xE3 h\u1EBFt bu\u1ED5i!`,
          message: `\u0110\xE3 h\u1ECDc ${sessionsUsed} bu\u1ED5i, c\u1EA7n thu th\xEAm h\u1ECDc ph\xED.`,
          icon: "\u{1F534}",
          isRead: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          link: "hoc-phi",
          studentId: student.id,
          studentName: student.name,
          priority: "high"
        });
      } else if (remaining > 0 && remaining <= 2 && !existsToday("fee_warning", student.id)) {
        newNotifs.push({
          id: genId(),
          type: "fee_warning",
          title: `${student.name} s\u1EAFp h\u1EBFt bu\u1ED5i`,
          message: `Ch\u1EC9 c\xF2n ${remaining} bu\u1ED5i. Nh\u1EAFc ph\u1EE5 huynh \u0111\xF3ng th\xEAm.`,
          icon: "\u{1F7E1}",
          isRead: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          link: "hoc-phi",
          studentId: student.id,
          studentName: student.name,
          priority: "medium"
        });
      }
    }
    const VIET_DAY_MAP = {
      0: ["cn", "ch\u1EE7 nh\u1EADt"],
      1: ["th\u1EE9 2", "t2"],
      2: ["th\u1EE9 3", "t3"],
      3: ["th\u1EE9 4", "t4"],
      4: ["th\u1EE9 5", "t5"],
      5: ["th\u1EE9 6", "t6"],
      6: ["th\u1EE9 7", "t7"]
    };
    const todayNames = VIET_DAY_MAP[dayOfWeek] || [];
    for (const cls of classes) {
      if (cls.status === "inactive") continue;
      const days = Array.isArray(cls.scheduleDays) ? cls.scheduleDays : [];
      const hasToday = days.some((d) => todayNames.some((tn) => d.toLowerCase().includes(tn)));
      if (hasToday) {
        const attendedToday = attendance.some((a) => a.date === today && a.className === cls.name);
        if (!attendedToday && !existsToday("todo", cls.id)) {
          newNotifs.push({
            id: genId(),
            type: "todo",
            title: `\u0110i\u1EC3m danh l\u1EDBp ${cls.name}`,
            message: `${cls.scheduleTime || ""} \u2014 Ch\u01B0a \u0111i\u1EC3m danh h\xF4m nay.`,
            icon: "\u{1F4CB}",
            isRead: false,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            link: "diem-danh",
            priority: "high"
          });
        }
      }
    }
    if (!existsToday("system")) {
      const monthlyTxCount = transactions.filter((t) => t.paymentDate?.startsWith(today.slice(0, 7))).length;
      newNotifs.push({
        id: genId(),
        type: "system",
        title: "Ch\xE0o bu\u1ED5i s\xE1ng! \u2600\uFE0F",
        message: `H\xF4m nay ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}. Th\xE1ng n\xE0y c\xF3 ${monthlyTxCount} giao d\u1ECBch.`,
        icon: "\u{1F4CA}",
        isRead: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        priority: "low"
      });
    }
    if (newNotifs.length > 0) {
      const all = [...newNotifs, ...existing];
      const trimmed = all.slice(0, 100);
      await this.saveNotifications(trimmed);
    }
    return newNotifs;
  }
  // ─── Backup & Restore ──────────────────────────────────────────────────────
  async getBackupData() {
    const [transactions, students, classes, attendance, settings, users, enrollments] = await Promise.all([
      this.getTransactions(),
      this.getStudents(),
      this.getClasses(),
      this.getAttendance(),
      this.getSettings(),
      this.getUsers(),
      this.getEnrollments()
    ]);
    return {
      version: "1.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      data: {
        transactions,
        students,
        classes,
        attendance,
        settings,
        users,
        enrollments
      }
    };
  }
  async restoreFromBackup(backup) {
    try {
      const { data } = backup;
      if (!data) throw new Error("D\u1EEF li\u1EC7u backup kh\xF4ng h\u1EE3p l\u1EC7");
      const stats = {};
      if (this.isCloud && this.mongoClient) {
        const dbConn = this.mongoClient.db(this.dbName);
        const collections = [
          { name: "transactions", items: data.transactions },
          { name: "students", items: data.students },
          { name: "classes", items: data.classes },
          { name: "attendance", items: data.attendance },
          { name: "users", items: data.users },
          { name: "enrollments", items: data.enrollments }
        ];
        for (const col of collections) {
          if (col.items && Array.isArray(col.items)) {
            await dbConn.collection(col.name).deleteMany({});
            if (col.items.length > 0) {
              await dbConn.collection(col.name).insertMany(col.items);
            }
            stats[col.name] = col.items.length;
          }
        }
        if (data.settings) {
          await dbConn.collection("settings").deleteMany({});
          await dbConn.collection("settings").insertOne(data.settings);
          stats["settings"] = 1;
        }
      } else {
        if (data.transactions) {
          fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data.transactions, null, 2), "utf-8");
          stats["transactions"] = data.transactions.length;
        }
        if (data.students) {
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify(data.students, null, 2), "utf-8");
          stats["students"] = data.students.length;
        }
        if (data.classes) {
          fs.writeFileSync(CLASSES_FILE, JSON.stringify(data.classes, null, 2), "utf-8");
          stats["classes"] = data.classes.length;
        }
        if (data.attendance) {
          fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data.attendance, null, 2), "utf-8");
          stats["attendance"] = data.attendance.length;
        }
        if (data.users) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(data.users, null, 2), "utf-8");
          stats["users"] = data.users.length;
        }
        if (data.enrollments) {
          fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(data.enrollments, null, 2), "utf-8");
          stats["enrollments"] = data.enrollments.length;
        }
        if (data.settings) {
          fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data.settings, null, 2), "utf-8");
          stats["settings"] = 1;
        }
      }
      return { success: true, message: "Kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u th\xE0nh c\xF4ng!", stats };
    } catch (err) {
      return { success: false, message: err.message || "L\u1ED7i kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u", stats: {} };
    }
  }
  // ─── Staff Management ─────────────────────────────────────────────────────────
  async getStaff() {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const list = await dbConn.collection("staff").find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(STAFF_FILE, "utf-8");
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
  }
  async createStaff(staff) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newStaff = { ...staff };
      await dbConn.collection("staff").insertOne(newStaff);
      const { _id, ...rest } = newStaff;
      return rest;
    } else {
      const list = await this.getStaff();
      list.push(staff);
      fs.writeFileSync(STAFF_FILE, JSON.stringify(list, null, 2), "utf-8");
      return staff;
    }
  }
  async updateStaff(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection("staff").updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection("staff").findOne({ id });
      if (!doc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn");
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getStaff();
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error("Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn");
      list[idx] = { ...list[idx], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      fs.writeFileSync(STAFF_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[idx];
    }
  }
  async deleteStaff(id) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection("staff").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getStaff();
      const filtered = list.filter((s) => s.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(STAFF_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  // ─── Teaching Logs (Chấm công GV) ──────────────────────────────────────────
  async getTeachingLogs(query) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter = {};
      if (query?.staffId) filter.staffId = query.staffId;
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      const list = await dbConn.collection("teaching_logs").find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(TEACHING_LOGS_FILE, "utf-8");
        let list = JSON.parse(data);
        if (query?.staffId) list = list.filter((l) => l.staffId === query.staffId);
        if (query?.month) list = list.filter((l) => l.date.startsWith(query.month));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch {
        return [];
      }
    }
  }
  async createTeachingLog(log) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newLog = { ...log };
      await dbConn.collection("teaching_logs").insertOne(newLog);
      const { _id, ...rest } = newLog;
      return rest;
    } else {
      const list = await this.getTeachingLogs();
      list.push(log);
      fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify(list, null, 2), "utf-8");
      return log;
    }
  }
  async deleteTeachingLog(id) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection("teaching_logs").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(TEACHING_LOGS_FILE, "utf-8");
        const list = JSON.parse(data);
        const filtered = list.filter((l) => l.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
        return true;
      } catch {
        return false;
      }
    }
  }
  // ─── Salary Advances (Ứng lương) ──────────────────────────────────────────
  async getSalaryAdvances(query) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter = {};
      if (query?.staffId) filter.staffId = query.staffId;
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      const list = await dbConn.collection("salary_advances").find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(SALARY_ADVANCES_FILE, "utf-8");
        let list = JSON.parse(data);
        if (query?.staffId) list = list.filter((a) => a.staffId === query.staffId);
        if (query?.month) list = list.filter((a) => a.date.startsWith(query.month));
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch {
        return [];
      }
    }
  }
  async createSalaryAdvance(advance) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newAdv = { ...advance };
      await dbConn.collection("salary_advances").insertOne(newAdv);
      const { _id, ...rest } = newAdv;
      return rest;
    } else {
      const list = await this.getSalaryAdvances();
      list.push(advance);
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return advance;
    }
  }
  async updateSalaryAdvance(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection("salary_advances").updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection("salary_advances").findOne({ id });
      if (!doc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kho\u1EA3n \u1EE9ng");
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getSalaryAdvances();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kho\u1EA3n \u1EE9ng");
      list[idx] = { ...list[idx], ...updates };
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[idx];
    }
  }
  async deleteSalaryAdvance(id) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection("salary_advances").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(SALARY_ADVANCES_FILE, "utf-8");
        const list = JSON.parse(data);
        const filtered = list.filter((a) => a.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
        return true;
      } catch {
        return false;
      }
    }
  }
  // ─── Monthly Salaries (Bảng lương tháng) ───────────────────────────────────
  async getMonthlySalaries(query) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter = {};
      if (query?.month) filter.month = query.month;
      if (query?.staffId) filter.staffId = query.staffId;
      const list = await dbConn.collection("monthly_salaries").find(filter).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(MONTHLY_SALARIES_FILE, "utf-8");
        let list = JSON.parse(data);
        if (query?.month) list = list.filter((s) => s.month === query.month);
        if (query?.staffId) list = list.filter((s) => s.staffId === query.staffId);
        return list;
      } catch {
        return [];
      }
    }
  }
  async createOrUpdateMonthlySalary(salary) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const existing = await dbConn.collection("monthly_salaries").findOne({
        staffId: salary.staffId,
        month: salary.month
      });
      if (existing) {
        await dbConn.collection("monthly_salaries").updateOne(
          { staffId: salary.staffId, month: salary.month },
          { $set: salary }
        );
      } else {
        await dbConn.collection("monthly_salaries").insertOne({ ...salary });
      }
      const doc = await dbConn.collection("monthly_salaries").findOne({
        staffId: salary.staffId,
        month: salary.month
      });
      if (!doc) return salary;
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getMonthlySalaries();
      const idx = list.findIndex((s) => s.staffId === salary.staffId && s.month === salary.month);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...salary };
      } else {
        list.push(salary);
      }
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return idx >= 0 ? list[idx] : salary;
    }
  }
  async updateMonthlySalaryStatus(id, status) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection("monthly_salaries").updateOne({ id }, { $set: { status } });
      const doc = await dbConn.collection("monthly_salaries").findOne({ id });
      if (!doc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\u1EA3ng l\u01B0\u01A1ng");
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getMonthlySalaries();
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\u1EA3ng l\u01B0\u01A1ng");
      list[idx].status = status;
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[idx];
    }
  }
  async deleteMonthlySalary(id) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection("monthly_salaries").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(MONTHLY_SALARIES_FILE, "utf-8");
        const list = JSON.parse(data);
        const filtered = list.filter((s) => s.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
        return true;
      } catch {
        return false;
      }
    }
  }
  // Calculate monthly salary for a staff member
  async calculateMonthlySalary(staffId, month) {
    const staffList = await this.getStaff();
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) throw new Error("Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn");
    const teachingLogs = await this.getTeachingLogs({ staffId, month });
    const advances = await this.getSalaryAdvances({ staffId, month });
    const totalSessions = teachingLogs.reduce((sum, l) => sum + (l.sessions || 1), 0);
    const teachingIncome = staff.role === "teacher" ? totalSessions * staff.ratePerSession : 0;
    const totalAdvance = advances.reduce((sum, a) => sum + a.amount, 0);
    const existingSalaries = await this.getMonthlySalaries({ staffId, month });
    const existing = existingSalaries[0];
    const otherIncome = existing?.otherIncome ?? 0;
    const kpiDeduction = existing?.kpiDeduction ?? 0;
    const baseSalary = staff.baseSalary || 0;
    const grossSalary = teachingIncome + baseSalary + otherIncome - kpiDeduction;
    const taxRate = 0.1;
    const taxAmount = Math.round(grossSalary * taxRate);
    const payableAmount = grossSalary - taxAmount;
    const advanceApplied = Math.min(totalAdvance, Math.max(payableAmount, 0));
    const advanceCarryOver = totalAdvance - advanceApplied;
    const netSalary = Math.max(payableAmount - advanceApplied, 0);
    const salary = {
      id: existing?.id || `sal_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      staffId,
      staffName: staff.name,
      month,
      role: staff.role,
      totalSessions,
      ratePerSession: staff.ratePerSession || 0,
      teachingIncome,
      baseSalary,
      otherIncome,
      kpiDeduction,
      grossSalary,
      taxRate,
      taxAmount,
      totalAdvance,
      advanceApplied,
      advanceCarryOver,
      netSalary,
      status: existing?.status || "draft",
      notes: existing?.notes || (advanceCarryOver > 0 ? `\u26A0\uFE0F \u1EE8ng v\u01B0\u1EE3t l\u01B0\u01A1ng: ${advanceCarryOver.toLocaleString("vi-VN")}\u0111 chuy\u1EC3n sang th\xE1ng sau` : ""),
      createdAt: existing?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    return await this.createOrUpdateMonthlySalary(salary);
  }
  async getExpenses(query) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter = {};
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      if (query?.category) filter.category = query.category;
      const list = await dbConn.collection("expenses").find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(this.EXPENSES_FILE, "utf-8");
        let list = JSON.parse(data);
        if (query?.month) list = list.filter((e) => e.date?.startsWith(query.month));
        if (query?.category) list = list.filter((e) => e.category === query.category);
        return list.sort((a, b) => b.date.localeCompare(a.date));
      } catch {
        return [];
      }
    }
  }
  async createExpense(expense) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newExpense = { ...expense };
      await dbConn.collection("expenses").insertOne(newExpense);
      const { _id, ...rest } = newExpense;
      return rest;
    } else {
      const list = await this.getExpenses();
      list.push(expense);
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return expense;
    }
  }
  async updateExpense(id, updates) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection("expenses").updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection("expenses").findOne({ id });
      if (!doc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kho\u1EA3n chi");
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getExpenses();
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kho\u1EA3n chi");
      list[idx] = { ...list[idx], ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(list, null, 2), "utf-8");
      return list[idx];
    }
  }
  async deleteExpense(id) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection("expenses").deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getExpenses();
      const filtered = list.filter((e) => e.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
  }
  async getAuditLogs(limit = 200) {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const logs = await dbConn.collection("audit_logs").find({}).sort({ timestamp: -1 }).limit(limit).toArray();
      return logs.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(this.AUDIT_LOG_FILE)) return [];
        const data = fs.readFileSync(this.AUDIT_LOG_FILE, "utf-8");
        const logs = JSON.parse(data);
        return logs.slice(0, limit);
      } catch {
        return [];
      }
    }
  }
  async addAuditLog(entry) {
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...entry,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection("audit_logs").insertOne(log);
      const count = await dbConn.collection("audit_logs").countDocuments();
      if (count > 1e3) {
        const oldest = await dbConn.collection("audit_logs").find({}).sort({ timestamp: 1 }).limit(count - 1e3).toArray();
        const ids = oldest.map((o) => o._id);
        await dbConn.collection("audit_logs").deleteMany({ _id: { $in: ids } });
      }
    } else {
      try {
        let logs = [];
        if (fs.existsSync(this.AUDIT_LOG_FILE)) {
          logs = JSON.parse(fs.readFileSync(this.AUDIT_LOG_FILE, "utf-8"));
        }
        logs.unshift(log);
        if (logs.length > 1e3) logs = logs.slice(0, 1e3);
        fs.writeFileSync(this.AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
      } catch {
      }
    }
  }
};
var db = new DatabaseService();

// server.ts
dotenv2.config();
var app = express();
var PORT = process.env.PORT || 3001;
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
app.use(express.json({ limit: "50mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.static(path2.join(__dirname2, "dist")));
var sessions = /* @__PURE__ */ new Map();
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
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u" });
  }
  try {
    const users = await db.getUsers();
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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "L\u1ED7i m\xE1y ch\u1EE7: " + error.message });
  }
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
app.get("/api/users", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/users", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: "Vui l\xF2ng \u0111i\u1EC1n \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin" });
  }
  try {
    const users = await db.getUsers();
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
    const saved = await db.createUser(newUser);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const { username, password, name, role } = req.body;
  try {
    const users = await db.getUsers();
    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
    }
    const updates = {};
    if (username && username.toLowerCase() !== users[userIndex].username) {
      if (users.some((u) => u.username === username.toLowerCase())) {
        return res.status(400).json({ message: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
      }
      updates.username = username.toLowerCase();
    }
    if (password) updates.password = password;
    if (name) updates.name = name;
    if (role) updates.role = role;
    const updated = await db.updateUser(id, updates);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  try {
    const users = await db.getUsers();
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
    }
    if (userToDelete.username === req.user.username) {
      return res.status(400).json({ message: "Kh\xF4ng th\u1EC3 t\u1EF1 x\xF3a t\xE0i kho\u1EA3n c\u1EE7a ch\xEDnh m\xECnh!" });
    }
    const success = await db.deleteUser(id);
    if (success) {
      res.json({ success: true, message: "X\xF3a ng\u01B0\u1EDDi d\xF9ng th\xE0nh c\xF4ng" });
    } else {
      res.status(500).json({ message: "Kh\xF4ng th\u1EC3 x\xF3a ng\u01B0\u1EDDi d\xF9ng" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const list = await db.getTransactions();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/transactions", authenticateToken, async (req, res) => {
  const data = req.body;
  const newTx = {
    ...data,
    id: data.id || Math.random().toString(36).substring(2, 9),
    createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    isReconciled: false,
    isInvoiced: false
  };
  try {
    const saved = await db.createTransaction(newTx);
    await db.upsertStudent(newTx.studentName, newTx.className);
    await db.addAuditLog({
      action: "CREATE",
      entity: "transaction",
      entityId: saved.id,
      details: `Thu ${Number(newTx.amount).toLocaleString("vi-VN")}\u0111 \u2014 ${newTx.studentName} \u2014 ${newTx.revenueCategory || ""}`,
      user: req.user?.name || req.user?.username || "unknown"
    });
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  try {
    const success = await db.deleteTransaction(id);
    if (success) {
      await db.addAuditLog({
        action: "DELETE",
        entity: "transaction",
        entityId: id,
        details: `X\xF3a giao d\u1ECBch #${id}`,
        user: req.user?.name || req.user?.username || "unknown"
      });
      res.json({ success: true, message: "X\xF3a giao d\u1ECBch th\xE0nh c\xF4ng" });
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch ho\u1EB7c kh\xF4ng th\u1EC3 x\xF3a" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/transactions/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n s\u1EEDa giao d\u1ECBch" });
  }
  const { id } = req.params;
  try {
    const updated = await db.updateTransaction(id, req.body, req.user?.name || req.user?.username);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.patch("/api/transactions/:id/reconcile", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { isReconciled } = req.body;
  if (typeof isReconciled !== "boolean") {
    return res.status(400).json({ message: "D\u1EEF li\u1EC7u isReconciled kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  try {
    const updated = await db.updateTransactionReconciled(id, isReconciled);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.patch("/api/transactions/:id/invoice", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  const { isInvoiced } = req.body;
  if (typeof isInvoiced !== "boolean") {
    return res.status(400).json({ message: "D\u1EEF li\u1EC7u isInvoiced kh\xF4ng h\u1EE3p l\u1EC7" });
  }
  try {
    const updated = await db.updateTransactionInvoiced(id, isInvoiced);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/students", authenticateToken, async (req, res) => {
  try {
    const list = await db.getStudents();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/students", authenticateToken, async (req, res) => {
  try {
    const studentData = req.body;
    const saved = await db.createStudent(studentData);
    await db.addAuditLog({
      action: "CREATE",
      entity: "student",
      entityId: saved.id,
      details: `Th\xEAm h\u1ECDc vi\xEAn: ${studentData.name} \u2014 L\u1EDBp ${studentData.className || "N/A"}`,
      user: req.user?.name || req.user?.username || "unknown"
    });
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/students/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const students = await db.getStudents();
    const oldStudent = students.find((s) => s.id === id);
    const oldName = oldStudent?.name || "";
    const updates = { ...req.body };
    const feeChangeMode = updates.feeChangeMode || "retroactive";
    delete updates.feeChangeMode;
    if (oldStudent && updates.feePerSession !== void 0) {
      const oldFee = Number(oldStudent.feePerSession) || 0;
      const newFee = Number(updates.feePerSession) || 0;
      if (oldFee !== newFee) {
        const feeHistory = Array.isArray(oldStudent.feeHistory) ? [...oldStudent.feeHistory] : [];
        feeHistory.push({
          changedBy: req.user?.name || req.user?.username || "H\u1EC7 th\u1ED1ng",
          changedAt: (/* @__PURE__ */ new Date()).toISOString(),
          oldFee,
          newFee,
          mode: feeChangeMode
          // 'retroactive' | 'prospective'
        });
        updates.feeHistory = feeHistory;
      }
    }
    const updated = await db.updateStudent(id, updates);
    if (!updated) {
      return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc vi\xEAn" });
    }
    const newName = updated.name || "";
    if (oldName && newName && oldName.toLowerCase() !== newName.toLowerCase()) {
      const cascadeResult = await db.cascadeUpdateStudentName(id, oldName, newName);
      console.log(`\u{1F504} Cascade update t\xEAn "${oldName}" \u2192 "${newName}":`, cascadeResult);
      return res.json({
        ...updated,
        _cascadeUpdate: cascadeResult
      });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/students/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  try {
    const success = await db.deleteStudent(id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc vi\xEAn" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/classes", authenticateToken, async (req, res) => {
  try {
    const list = await db.getClasses();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/classes", authenticateToken, async (req, res) => {
  try {
    const saved = await db.createClass(req.body);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/classes/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateClass(id, req.body);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/classes/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
  }
  const { id } = req.params;
  try {
    const success = await db.deleteClass(id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/attendance", authenticateToken, async (req, res) => {
  try {
    const { date, classId, studentId } = req.query;
    const filters = {};
    if (date) filters.date = date;
    if (classId) filters.classId = classId;
    if (studentId) filters.studentId = studentId;
    const list = await db.getAttendance(filters);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/attendance/batch", authenticateToken, async (req, res) => {
  try {
    const { records, teacherId, teacherName, isSubstitute, originalTeacherId, originalTeacherName, classId } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "D\u1EEF li\u1EC7u \u0111i\u1EC3m danh kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    const enrichedRecords = records.map((r) => ({
      ...r,
      teacherId: teacherId || void 0,
      teacherName: teacherName || void 0,
      isSubstitute: isSubstitute || false
    }));
    const saved = await db.createAttendanceBatch(enrichedRecords);
    if (teacherId && records.some((r) => r.status === "present")) {
      const date = records[0]?.date;
      const className = records[0]?.className;
      if (date && className) {
        const existingLogs = await db.getTeachingLogs({ month: date.slice(0, 7) });
        const alreadyExists = existingLogs.some(
          (l) => l.staffId === teacherId && l.date === date && l.className === className
        );
        if (!alreadyExists) {
          await db.createTeachingLog({
            staffId: teacherId,
            staffName: teacherName || "",
            date,
            className,
            classId: classId || "",
            sessions: 1,
            isSubstitute: isSubstitute || false,
            originalTeacherId: isSubstitute ? originalTeacherId || "" : void 0,
            originalTeacherName: isSubstitute ? originalTeacherName || "" : void 0,
            source: "auto"
          });
          console.log(`\u2705 Auto TeachingLog: ${teacherName} \u2192 ${className} (${date})${isSubstitute ? " [D\u1EA0Y THAY]" : ""}`);
        }
      }
    }
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/attendance/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const allAttendance = await db.getAttendance();
    const deletedRecord = allAttendance.find((a) => a.id === id);
    const success = await db.deleteAttendance(id);
    if (success) {
      if (deletedRecord) {
        const { date, className, classId } = deletedRecord;
        if (date && (className || classId)) {
          const remaining = allAttendance.filter(
            (a) => a.id !== id && a.date === date && (a.className === className || a.classId === classId) && a.status === "present"
          );
          if (remaining.length === 0) {
            const logs = await db.getTeachingLogs({ month: date.slice(0, 7) });
            const autoLog = logs.find(
              (l) => l.date === date && l.className === className && l.source === "auto"
            );
            if (autoLog) {
              await db.deleteTeachingLog(autoLog.id);
              console.log(`\u{1F5D1}\uFE0F Auto-deleted TeachingLog: ${className} (${date}) \u2014 no present students`);
            }
          }
        }
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n ghi \u0111i\u1EC3m danh" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/enrollments", authenticateToken, async (req, res) => {
  try {
    const { studentId, className, isActive } = req.query;
    const filters = {};
    if (studentId) filters.studentId = studentId;
    if (className) filters.className = className;
    if (isActive !== void 0) filters.isActive = isActive === "true";
    const list = await db.getEnrollments(filters);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/enrollments", authenticateToken, async (req, res) => {
  try {
    const created = await db.createEnrollment(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/enrollments/transfer", authenticateToken, async (req, res) => {
  try {
    const { studentId, studentName, newClassName, newFeePerSession, transferDate, transferNote } = req.body;
    if (!studentId || !newClassName || !transferDate) {
      return res.status(400).json({ message: "Thi\u1EBFu th\xF4ng tin chuy\u1EC3n l\u1EDBp (studentId, newClassName, transferDate)" });
    }
    const result = await db.transferClass({
      studentId,
      studentName,
      newClassName,
      newFeePerSession: Number(newFeePerSession) || 0,
      transferDate,
      transferNote
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/settings", async (_req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/settings", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n thay \u0111\u1ED5i c\xE0i \u0111\u1EB7t" });
  }
  try {
    const updated = await db.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const list = await db.getNotifications();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const result = await db.updateNotification(req.params.id, { isRead: true });
    if (!result) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.patch("/api/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    const count = await db.markAllNotificationsRead();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
  try {
    const ok = await db.deleteNotification(req.params.id);
    if (!ok) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/notifications/generate", authenticateToken, async (req, res) => {
  try {
    const newNotifs = await db.generateNotifications();
    const allNotifs = await db.getNotifications();
    res.json(allNotifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/backup", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 t\u1EA1o backup" });
  }
  try {
    const backupData = await db.getBackupData();
    await db.addAuditLog({
      action: "BACKUP",
      entity: "system",
      details: "Xu\u1EA5t backup to\xE0n b\u1ED9 d\u1EEF li\u1EC7u",
      user: req.user?.name || req.user?.username || "unknown"
    });
    res.json(backupData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/restore", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u" });
  }
  try {
    const result = await db.restoreFromBackup(req.body);
    if (result.success) {
      await db.addAuditLog({
        action: "RESTORE",
        entity: "system",
        details: `Kh\xF4i ph\u1EE5c t\u1EEB backup: ${JSON.stringify(result.stats)}`,
        user: req.user?.name || req.user?.username || "unknown"
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/audit-logs", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 xem audit log" });
  }
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs = await db.getAuditLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/staff", authenticateToken, async (req, res) => {
  try {
    const staff = await db.getStaff();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/staff", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 th\xEAm nh\xE2n vi\xEAn" });
  }
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const staff = {
      id: `staff_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: now,
      updatedAt: now
    };
    const result = await db.createStaff(staff);
    await db.addAuditLog({
      action: "CREATE",
      entity: "staff",
      entityId: staff.id,
      details: `Th\xEAm nh\xE2n vi\xEAn: ${staff.name} (${staff.role === "teacher" ? "Gi\xE1o vi\xEAn" : "V\u0103n ph\xF2ng"})`,
      user: req.user?.name || "unknown"
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/staff/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 s\u1EEDa nh\xE2n vi\xEAn" });
  }
  try {
    const result = await db.updateStaff(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/staff/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 x\xF3a nh\xE2n vi\xEAn" });
  }
  try {
    const success = await db.deleteStaff(req.params.id);
    if (!success) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y nh\xE2n vi\xEAn" });
    await db.addAuditLog({
      action: "DELETE",
      entity: "staff",
      entityId: req.params.id,
      details: `X\xF3a nh\xE2n vi\xEAn ID: ${req.params.id}`,
      user: req.user?.name || "unknown"
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/expenses", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.month) query.month = req.query.month;
    if (req.query.category) query.category = req.query.category;
    const expenses = await db.getExpenses(query);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/expenses", authenticateToken, async (req, res) => {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const expense = {
      id: `exp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdBy: req.user?.name || "unknown",
      createdAt: now,
      updatedAt: now
    };
    const result = await db.createExpense(expense);
    await db.addAuditLog({
      action: "CREATE",
      entity: "expense",
      entityId: expense.id,
      details: `Th\xEAm kho\u1EA3n chi: ${expense.category} - ${expense.description} (${expense.amount?.toLocaleString()}\u0111)`,
      user: req.user?.name || "unknown"
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/expenses/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.updateExpense(req.params.id, req.body);
    await db.addAuditLog({
      action: "UPDATE",
      entity: "expense",
      entityId: req.params.id,
      details: `S\u1EEDa kho\u1EA3n chi ID: ${req.params.id}`,
      user: req.user?.name || "unknown"
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/expenses/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 x\xF3a kho\u1EA3n chi" });
  }
  try {
    const success = await db.deleteExpense(req.params.id);
    if (!success) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y kho\u1EA3n chi" });
    await db.addAuditLog({
      action: "DELETE",
      entity: "expense",
      entityId: req.params.id,
      details: `X\xF3a kho\u1EA3n chi ID: ${req.params.id}`,
      user: req.user?.name || "unknown"
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/teaching-logs", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.staffId) query.staffId = req.query.staffId;
    if (req.query.month) query.month = req.query.month;
    const logs = await db.getTeachingLogs(query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/teaching-logs", authenticateToken, async (req, res) => {
  try {
    const log = {
      id: `tlog_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const result = await db.createTeachingLog(log);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/teaching-logs/:id", authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteTeachingLog(req.params.id);
    if (!success) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/salary-advances", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.staffId) query.staffId = req.query.staffId;
    if (req.query.month) query.month = req.query.month;
    const advances = await db.getSalaryAdvances(query);
    res.json(advances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/salary-advances", authenticateToken, async (req, res) => {
  try {
    const advance = {
      id: `adv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...req.body,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const result = await db.createSalaryAdvance(advance);
    await db.addAuditLog({
      action: "CREATE",
      entity: "salary_advance",
      entityId: advance.id,
      details: `\u1EE8ng l\u01B0\u01A1ng: ${advance.staffName} - ${advance.amount?.toLocaleString()}\u0111`,
      user: req.user?.name || "unknown"
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/salary-advances/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.updateSalaryAdvance(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete("/api/salary-advances/:id", authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteSalaryAdvance(req.params.id);
    if (!success) return res.status(404).json({ message: "Kh\xF4ng t\xECm th\u1EA5y" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("/api/monthly-salaries", authenticateToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.month) query.month = req.query.month;
    if (req.query.staffId) query.staffId = req.query.staffId;
    const salaries = await db.getMonthlySalaries(query);
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.post("/api/monthly-salaries/calculate", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 t\xEDnh l\u01B0\u01A1ng" });
  }
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ message: "Thi\u1EBFu th\xE1ng t\xEDnh l\u01B0\u01A1ng" });
    const staff = await db.getStaff();
    const activeStaff = staff.filter((s) => s.status === "active");
    const results = [];
    for (const s of activeStaff) {
      const salary = await db.calculateMonthlySalary(s.id, month);
      results.push(salary);
    }
    await db.addAuditLog({
      action: "CREATE",
      entity: "monthly_salary",
      details: `T\xEDnh l\u01B0\u01A1ng th\xE1ng ${month} cho ${results.length} nh\xE2n vi\xEAn`,
      user: req.user?.name || "unknown"
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/monthly-salaries/:id/status", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i l\u01B0\u01A1ng" });
  }
  try {
    const result = await db.updateMonthlySalaryStatus(req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put("/api/monthly-salaries/:id", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ch\u1EC9 admin m\u1EDBi c\xF3 th\u1EC3 c\u1EADp nh\u1EADt b\u1EA3ng l\u01B0\u01A1ng" });
  }
  try {
    const result = await db.createOrUpdateMonthlySalary({ ...req.body, id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get("*", (req, res) => {
  res.sendFile(path2.join(__dirname2, "dist", "index.html"));
});
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("\u274C Failed to initialize database:", err);
  process.exit(1);
});

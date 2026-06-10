import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const DEFAULT_USERS = [
  { id: '1', username: 'ketoan', password: 'password123', name: 'Nguyễn Kế Toán', role: 'admin' },
  { id: '2', username: 'nvvp', password: 'password123', name: 'Nguyễn Minh Anh', role: 'staff' },
  { id: '3', username: 'admin', password: 'password123', name: 'Quản Trị Viên', role: 'admin' }
];

class DatabaseService {
  public isCloud: boolean = false;
  private mongoClient: MongoClient | null = null;
  private dbName: string = 'kim_academy';

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      this.isCloud = true;
      this.mongoClient = new MongoClient(mongoUri);
      // Try to extract database name from URI if present, e.g. /kim_academy?
      const match = mongoUri.match(/\/([^/?]+)(\?|$)/);
      if (match && match[1]) {
        this.dbName = match[1];
      }
    }
  }

  async init(): Promise<void> {
    if (this.isCloud && this.mongoClient) {
      try {
        console.log('🔌 Connecting to MongoDB Atlas cloud database...');
        await this.mongoClient.connect();
        console.log('✅ Connected to MongoDB Atlas successfully.');
        
        // Seed default users if users collection is empty
        const db = this.mongoClient.db(this.dbName);
        const usersCol = db.collection('users');
        const count = await usersCol.countDocuments();
        if (count === 0) {
          console.log('🌱 Seeding default users into MongoDB Atlas...');
          await usersCol.insertMany(DEFAULT_USERS);
        } else {
          // Migration: Ensure 'admin' user is present in MongoDB
          const adminExists = await usersCol.findOne({ username: 'admin' });
          if (!adminExists) {
            console.log('🌱 Migrating admin user into MongoDB Atlas...');
            await usersCol.insertOne({ id: '3', username: 'admin', password: 'password123', name: 'Quản Trị Viên', role: 'admin' });
          }
        }
      } catch (error) {
        console.error('❌ Failed to connect to MongoDB Atlas, falling back to local files:', error);
        this.isCloud = false;
        this.initLocalFiles();
      }
    } else {
      this.initLocalFiles();
    }
  }

  private initLocalFiles() {
    console.log('📁 Using local JSON file-based database...');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    } else {
      // Migration: Ensure 'admin' user is present in users.json
      try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        const users = JSON.parse(data);
        if (!users.some((u: any) => u.username === 'admin')) {
          users.push({ id: '3', username: 'admin', password: 'password123', name: 'Quản Trị Viên', role: 'admin' });
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
        }
      } catch (error) {
        console.error('Error during users.json migration:', error);
      }
    }
    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  // --- Transactions ---
  async getTransactions(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      // Retrieve and sort by paymentDate then createdAt (or _id)
      const list = await db.collection('transactions').find({}).toArray();
      // Clean up Mongo properties (_id) from returned objects to keep schema clean
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error reading transactions file:', error);
        return [];
      }
    }
  }

  async createTransaction(tx: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const newTx = { ...tx };
      await db.collection('transactions').insertOne(newTx);
      const { _id, ...rest } = newTx;
      return rest;
    } else {
      const list = await this.getTransactions();
      list.push(tx);
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return tx;
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const res = await db.collection('transactions').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getTransactions();
      const filtered = list.filter(t => t.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  async updateTransactionReconciled(id: string, isReconciled: boolean): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('transactions').updateOne({ id }, { $set: { isReconciled } });
      const updated = await db.collection('transactions').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex(t => t.id === id);
      if (index === -1) return null;
      list[index].isReconciled = isReconciled;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
    }
  }

  async updateTransactionInvoiced(id: string, isInvoiced: boolean): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('transactions').updateOne({ id }, { $set: { isInvoiced } });
      const updated = await db.collection('transactions').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex(t => t.id === id);
      if (index === -1) return null;
      list[index].isInvoiced = isInvoiced;
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
    }
  }

  // --- Users ---
  async getUsers(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const list = await db.collection('users').find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error reading users file:', error);
        return DEFAULT_USERS;
      }
    }
  }

  async createUser(user: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const newUser = { ...user };
      await db.collection('users').insertOne(newUser);
      const { _id, ...rest } = newUser;
      return rest;
    } else {
      const list = await this.getUsers();
      list.push(user);
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return user;
    }
  }

  async updateUser(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('users').updateOne({ id }, { $set: updates });
      const updated = await db.collection('users').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getUsers();
      const index = list.findIndex(u => u.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates };
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const res = await db.collection('users').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getUsers();
      const filtered = list.filter(u => u.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }
}

export const db = new DatabaseService();

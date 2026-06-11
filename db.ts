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
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const ENROLLMENTS_FILE = path.join(DATA_DIR, 'enrollments.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');
const TEACHING_LOGS_FILE = path.join(DATA_DIR, 'teaching_logs.json');
const SALARY_ADVANCES_FILE = path.join(DATA_DIR, 'salary_advances.json');
const MONTHLY_SALARIES_FILE = path.join(DATA_DIR, 'monthly_salaries.json');

const DEFAULT_SETTINGS = {
  centerName: 'Kim Academy',
  logoUrl: '',
  phone: '',
  address: '',
  feeTypes: [
    'Học phí offline',
    'Học phí online',
    'Sách',
    'Đồng phục',
    'Lệ phí thi',
    'Thu khác',
  ],
  paymentMethods: [
    'Chuyển khoản',
    'Tiền mặt',
    'Momo',
    'ZaloPay',
    'Khác',
  ],
  expenseCategories: [
    'Mặt bằng',
    'Điện nước',
    'Internet',
    'Dụng cụ học tập',
    'Marketing/Quảng cáo',
    'Bảo trì/Sửa chữa',
    'Đối ngoại',
    'Văn phòng phẩm',
    'Quỹ hoạt động',
    'Chi khác',
  ],
};

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
      // Add TLS options for cloud hosting compatibility (Render, Railway, etc.)
      this.mongoClient = new MongoClient(mongoUri, {
        tls: true,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
      });
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
        console.log(`   Database: ${this.dbName}`);
        await this.mongoClient.connect();
        console.log('✅ Connected to MongoDB Atlas successfully.');
        
        const db = this.mongoClient.db(this.dbName);
        const usersCol = db.collection('users');
        const count = await usersCol.countDocuments();
        if (count === 0) {
          console.log('🌱 Seeding default users into MongoDB Atlas...');
          await usersCol.insertMany(DEFAULT_USERS);
        } else {
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
    if (!fs.existsSync(STUDENTS_FILE)) {
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(CLASSES_FILE)) {
      fs.writeFileSync(CLASSES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(ATTENDANCE_FILE)) {
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(ENROLLMENTS_FILE)) {
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    }
    // Staff module files
    if (!fs.existsSync(STAFF_FILE)) {
      fs.writeFileSync(STAFF_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(TEACHING_LOGS_FILE)) {
      fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(SALARY_ADVANCES_FILE)) {
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(MONTHLY_SALARIES_FILE)) {
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  // ─── Transactions ────────────────────────────────────────────────────────────
  async getTransactions(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const list = await db.collection('transactions').find({}).toArray();
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

  async updateTransaction(id: string, updates: Partial<{
    paymentDate: string;
    studentName: string;
    className: string;
    term: string;
    amount: number;
    paymentMethod: string;
    revenueCategory: string;
    senderName: string;
    notes: string;
    isReconciled: boolean;
    isInvoiced: boolean;
  }>, editedBy?: string): Promise<any> {
    const allowedFields = [
      'paymentDate', 'studentName', 'className', 'term', 'amount',
      'paymentMethod', 'revenueCategory', 'senderName', 'notes',
      'isReconciled', 'isInvoiced'
    ];

    let existing: any = null;
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      existing = await db.collection('transactions').findOne({ id });
    } else {
      const list = await this.getTransactions();
      existing = list.find((t: any) => t.id === id);
    }
    if (!existing) return null;

    const sanitized: any = { updatedAt: new Date().toISOString() };
    for (const key of allowedFields) {
      if ((updates as any)[key] !== undefined) {
        sanitized[key] = (updates as any)[key];
      }
    }

    // Generate edit history log
    const changes: any[] = [];
    for (const key of allowedFields) {
      if ((updates as any)[key] !== undefined && (updates as any)[key] !== existing[key]) {
        changes.push({
          field: key,
          oldValue: existing[key],
          newValue: (updates as any)[key]
        });
      }
    }

    if (changes.length > 0 && editedBy) {
      const logEntry = {
        editedBy,
        editedAt: new Date().toISOString(),
        changes
      };
      sanitized.editHistory = [...(existing.editHistory || []), logEntry];
    }

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('transactions').updateOne({ id }, { $set: sanitized });
      const updated = await db.collection('transactions').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getTransactions();
      const index = list.findIndex((t: any) => t.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...sanitized };
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
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

  // ─── Users ───────────────────────────────────────────────────────────────────
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

  // ─── Students ────────────────────────────────────────────────────────────────
  async getStudents(): Promise<any[]> {
    let rawList: any[] = [];
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const list = await db.collection('students').find({}).toArray();
      rawList = list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(STUDENTS_FILE)) {
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
        const data = fs.readFileSync(STUDENTS_FILE, 'utf-8');
        rawList = JSON.parse(data);
      } catch (error) {
        console.error('Error reading students file:', error);
        rawList = [];
      }
    }
    return rawList.map(s => ({
      ...s,
      status: s.status || 'active',
      enrollDate: s.enrollDate || s.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      parentEmail: s.parentEmail || '',
      address: s.address || '',
      notes: s.notes || ''
    }));
  }

  async upsertStudent(studentName: string, className: string): Promise<any> {
    const normalizedName = studentName.trim();
    if (!normalizedName) return null;
    
    const now = new Date().toISOString();
    const defaults = {
      status: 'active',
      enrollDate: now.slice(0, 10),
      parentEmail: '',
      address: '',
      notes: ''
    };

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const col = db.collection('students');
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
      if (existing) {
        await col.updateOne({ id: existing.id }, { $set: { className, updatedAt: now } });
        return { ...existing, className };
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || '',
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
      const existingIndex = list.findIndex(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existingIndex > -1) {
        list[existingIndex].className = className || '';
        list[existingIndex].updatedAt = now;
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        return list[existingIndex];
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || '',
          feePerSession: 0,
          ...defaults,
          createdAt: now,
          updatedAt: now
        };
        list.push(newStudent);
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        return newStudent;
      }
    }
  }

  async createStudent(student: any): Promise<any> {
    const normalizedName = student.name.trim();
    if (!normalizedName) return null;

    const newStudent = {
      id: student.id || Math.random().toString(36).substring(2, 9),
      name: normalizedName,
      vietnameseName: student.vietnameseName || '',
      englishName: student.englishName || '',
      vietAnhName: student.vietAnhName || '',
      className: student.className || '',
      gender: student.gender || '',
      birthYear: student.birthYear ? Number(student.birthYear) : 0,
      parentPhone: student.parentPhone || '',
      feePerSession: student.feePerSession ? Number(student.feePerSession) : 0,
      status: student.status || 'active',
      enrollDate: student.enrollDate || student.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      parentEmail: student.parentEmail || '',
      address: student.address || '',
      notes: student.notes || '',
      createdAt: student.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const col = db.collection('students');
      
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
      if (existing) {
        const updatedFields = { ...newStudent } as any;
        delete updatedFields.id;
        delete updatedFields.createdAt;
        
        await col.updateOne({ id: existing.id }, { $set: updatedFields });
        return { ...existing, ...updatedFields };
      }
      
      await col.insertOne(newStudent);
      const { _id, ...rest } = newStudent as any;
      return rest;
    } else {
      const list = await this.getStudents();
      const existingIndex = list.findIndex(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existingIndex > -1) {
        list[existingIndex] = {
          ...list[existingIndex],
          ...newStudent,
          id: list[existingIndex].id,
          createdAt: list[existingIndex].createdAt
        };
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        return list[existingIndex];
      } else {
        list.push(newStudent);
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        return newStudent;
      }
    }
  }

  async updateStudent(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      await db.collection('students').updateOne({ id }, { $set: updateData });
      const updated = await db.collection('students').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getStudents();
      const index = list.findIndex(s => s.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const res = await db.collection('students').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getStudents();
      const filtered = list.filter(s => s.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  // ─── Classes ─────────────────────────────────────────────────────────────────
  async getClasses(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const list = await db.collection('classes').find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(CLASSES_FILE)) {
          fs.writeFileSync(CLASSES_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
        const data = fs.readFileSync(CLASSES_FILE, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error reading classes file:', error);
        return [];
      }
    }
  }

  async createClass(cls: any): Promise<any> {
    const newClass = {
      id: cls.id || Math.random().toString(36).substring(2, 9),
      name: cls.name,
      type: cls.type || 'offline',
      schedule: cls.schedule || '',
      teacher: cls.teacher || '',
      description: cls.description || '',
      room: cls.room || '',
      maxStudents: Number(cls.maxStudents) || 0,
      status: cls.status || 'active',
      defaultFee: Number(cls.defaultFee) || 0,
      scheduleDays: cls.scheduleDays || [],
      scheduleTime: cls.scheduleTime || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('classes').insertOne(newClass);
      const { _id, ...rest } = newClass as any;
      return rest;
    } else {
      const list = await this.getClasses();
      list.push(newClass);
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return newClass;
    }
  }

  async updateClass(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const updateData = { ...updates, updatedAt: new Date().toISOString() };
      await db.collection('classes').updateOne({ id }, { $set: updateData });
      const updated = await db.collection('classes').findOne({ id });
      if (updated) {
        const { _id, ...rest } = updated;
        return rest;
      }
      return null;
    } else {
      const list = await this.getClasses();
      const index = list.findIndex(c => c.id === id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[index];
    }
  }

  async deleteClass(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const res = await db.collection('classes').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getClasses();
      const filtered = list.filter(c => c.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(CLASSES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  // ─── Attendance ──────────────────────────────────────────────────────────────
  async getAttendance(filters?: { date?: string; classId?: string; studentId?: string }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const query: any = {};
      if (filters?.date) query.date = filters.date;
      if (filters?.classId) query.classId = filters.classId;
      if (filters?.studentId) query.studentId = filters.studentId;
      const list = await db.collection('attendance').find(query).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(ATTENDANCE_FILE)) {
          fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
        const data = fs.readFileSync(ATTENDANCE_FILE, 'utf-8');
        let list: any[] = JSON.parse(data);
        if (filters?.date) list = list.filter(a => a.date === filters.date);
        if (filters?.classId) list = list.filter(a => a.classId === filters.classId);
        if (filters?.studentId) list = list.filter(a => a.studentId === filters.studentId);
        return list;
      } catch (error) {
        console.error('Error reading attendance file:', error);
        return [];
      }
    }
  }

  async createAttendanceBatch(records: any[]): Promise<any[]> {
    const now = new Date().toISOString();
    const newRecords = records.map(r => ({
      id: r.id || Math.random().toString(36).substring(2, 9),
      date: r.date,
      classId: r.classId,
      className: r.className,
      studentId: r.studentId,
      studentName: r.studentName,
      status: r.status, // present | absent | excused
      sessionsDeducted: r.status === 'excused' ? 0 : 1, // vắng có phép không trừ
      note: r.note || '', // Ghi chú lý do vắng
      createdAt: now
    }));

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      // Remove existing records for this date+class before re-inserting
      if (newRecords.length > 0) {
        await db.collection('attendance').deleteMany({
          date: newRecords[0].date,
          classId: newRecords[0].classId
        });
        await db.collection('attendance').insertMany(newRecords);
      }
      return newRecords;
    } else {
      let list = await this.getAttendance();
      if (newRecords.length > 0) {
        // Remove existing records for this date+class
        list = list.filter(a => !(a.date === newRecords[0].date && a.classId === newRecords[0].classId));
        list.push(...newRecords);
        fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(list, null, 2), 'utf-8');
      }
      return newRecords;
    }
  }

  async deleteAttendance(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const res = await db.collection('attendance').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getAttendance();
      const filtered = list.filter(a => a.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  // ─── Enrollments (Class Transfer History) ────────────────────────────────────
  async getEnrollments(filters?: { studentId?: string; className?: string; isActive?: boolean }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const query: any = {};
      if (filters?.studentId) query.studentId = filters.studentId;
      if (filters?.className) query.className = filters.className;
      if (filters?.isActive !== undefined) query.isActive = filters.isActive;
      const list = await db.collection('enrollments').find(query).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(ENROLLMENTS_FILE)) {
          fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
        const data = fs.readFileSync(ENROLLMENTS_FILE, 'utf-8');
        let list: any[] = JSON.parse(data);
        if (filters?.studentId) list = list.filter(e => e.studentId === filters.studentId);
        if (filters?.className) list = list.filter(e => e.className === filters.className);
        if (filters?.isActive !== undefined) list = list.filter(e => e.isActive === filters.isActive);
        return list;
      } catch (error) {
        console.error('Error reading enrollments file:', error);
        return [];
      }
    }
  }

  async createEnrollment(enrollment: any): Promise<any> {
    const newEnrollment = {
      id: enrollment.id || Math.random().toString(36).substring(2, 9),
      studentId: enrollment.studentId,
      studentName: enrollment.studentName,
      className: enrollment.className,
      feePerSession: Number(enrollment.feePerSession) || 0,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate || null,
      isActive: enrollment.isActive !== false,
      transferNote: enrollment.transferNote || '',
      createdAt: new Date().toISOString(),
    };

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('enrollments').insertOne(newEnrollment);
      const { _id, ...rest } = newEnrollment as any;
      return rest;
    } else {
      const list = await this.getEnrollments();
      list.push(newEnrollment);
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return newEnrollment;
    }
  }

  /**
   * transferClass: Đóng enrollment cũ + mở enrollment mới + cập nhật student.className
   */
  async transferClass(payload: {
    studentId: string;
    studentName: string;
    newClassName: string;
    newFeePerSession: number;
    transferDate: string;
    transferNote?: string;
  }): Promise<{ oldEnrollment: any; newEnrollment: any; student: any }> {
    const { studentId, studentName, newClassName, newFeePerSession, transferDate, transferNote } = payload;
    const now = new Date().toISOString();

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      // 1. Close all active enrollments for this student
      await db.collection('enrollments').updateMany(
        { studentId, isActive: true },
        { $set: { isActive: false, endDate: transferDate } }
      );
      // 2. Create new enrollment
      const newEnrollment = {
        id: Math.random().toString(36).substring(2, 9),
        studentId, studentName,
        className: newClassName,
        feePerSession: newFeePerSession,
        startDate: transferDate,
        endDate: null,
        isActive: true,
        transferNote: transferNote || '',
        createdAt: now,
      };
      await db.collection('enrollments').insertOne(newEnrollment);
      // 3. Update student
      await db.collection('students').updateOne(
        { id: studentId },
        { $set: { className: newClassName, feePerSession: newFeePerSession, updatedAt: now } }
      );
      const student = await db.collection('students').findOne({ id: studentId });
      const { _id: s_id, ...studentRest } = (student || {}) as any;
      const { _id: e_id, ...enrollRest } = newEnrollment as any;
      return { oldEnrollment: null, newEnrollment: enrollRest, student: studentRest };
    } else {
      // File-based fallback
      let enrollments = await this.getEnrollments();
      const closed = enrollments
        .filter(e => e.studentId === studentId && e.isActive)
        .map(e => ({ ...e, isActive: false, endDate: transferDate }));
      enrollments = enrollments.map(e =>
        e.studentId === studentId && e.isActive ? { ...e, isActive: false, endDate: transferDate } : e
      );
      const newEnrollment = {
        id: Math.random().toString(36).substring(2, 9),
        studentId, studentName,
        className: newClassName,
        feePerSession: newFeePerSession,
        startDate: transferDate,
        endDate: null,
        isActive: true,
        transferNote: transferNote || '',
        createdAt: now,
      };
      enrollments.push(newEnrollment);
      fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2), 'utf-8');
      // Update student
      const students = await this.getStudents();
      const idx = students.findIndex(s => s.id === studentId);
      if (idx > -1) {
        students[idx] = { ...students[idx], className: newClassName, feePerSession: newFeePerSession, updatedAt: now };
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8');
      }
      return { oldEnrollment: closed[0] || null, newEnrollment, student: students[idx] || null };
    }
  }
  // ─── Settings ────────────────────────────────────────────────────────────────────────────
  async getSettings(): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const doc = await db.collection('settings').findOne({ _type: 'global' });
      if (doc) {
        const { _id, _type, ...rest } = doc as any;
        return rest;
      }
      // If not yet in cloud, insert default
      await db.collection('settings').insertOne({ _type: 'global', ...DEFAULT_SETTINGS });
      return { ...DEFAULT_SETTINGS };
    } else {
      try {
        if (!fs.existsSync(SETTINGS_FILE)) {
          fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
        }
        const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error reading settings file:', error);
        return { ...DEFAULT_SETTINGS };
      }
    }
  }

  async updateSettings(updates: Partial<typeof DEFAULT_SETTINGS>): Promise<any> {
    const allowedKeys = ['centerName', 'logoUrl', 'phone', 'address', 'feeTypes', 'paymentMethods'];
    const sanitized: any = {};
    for (const key of allowedKeys) {
      if ((updates as any)[key] !== undefined) {
        sanitized[key] = (updates as any)[key];
      }
    }

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('settings').updateOne(
        { _type: 'global' },
        { $set: sanitized },
        { upsert: true }
      );
      const doc = await db.collection('settings').findOne({ _type: 'global' });
      if (doc) {
        const { _id, _type, ...rest } = doc as any;
        return rest;
      }
      return sanitized;
    } else {
      const current = await this.getSettings();
      const merged = { ...current, ...sanitized };
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
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
  async cascadeUpdateStudentName(studentId: string, oldName: string, newName: string): Promise<{
    transactionsUpdated: number;
    attendanceUpdated: number;
    enrollmentsUpdated: number;
  }> {
    let transactionsUpdated = 0;
    let attendanceUpdated = 0;
    let enrollmentsUpdated = 0;

    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);

      // Update transactions: match by studentId (if stored) OR by old name
      const txResult = await db.collection('transactions').updateMany(
        {
          $or: [
            { studentId: studentId },
            { studentName: { $regex: new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
          ]
        },
        { $set: { studentName: newName } }
      );
      transactionsUpdated = txResult.modifiedCount;

      // Update attendance records
      const attResult = await db.collection('attendance').updateMany(
        { studentId: studentId },
        { $set: { studentName: newName } }
      );
      attendanceUpdated = attResult.modifiedCount;

      // Update enrollments
      const enrollResult = await db.collection('enrollments').updateMany(
        { studentId: studentId },
        { $set: { studentName: newName } }
      );
      enrollmentsUpdated = enrollResult.modifiedCount;

    } else {
      // File-based fallback
      // Update transactions
      const transactions = await this.getTransactions();
      let txChanged = false;
      const updatedTransactions = transactions.map((t: any) => {
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
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(updatedTransactions, null, 2), 'utf-8');
      }

      // Update attendance
      const allAttendance = await this.getAttendance();
      let attChanged = false;
      const updatedAttendance = allAttendance.map((a: any) => {
        if (a.studentId === studentId) {
          attendanceUpdated++;
          attChanged = true;
          return { ...a, studentName: newName };
        }
        return a;
      });
      if (attChanged) {
        fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(updatedAttendance, null, 2), 'utf-8');
      }

      // Update enrollments
      const allEnrollments = await this.getEnrollments();
      let enrollChanged = false;
      const updatedEnrollments = allEnrollments.map((e: any) => {
        if (e.studentId === studentId) {
          enrollmentsUpdated++;
          enrollChanged = true;
          return { ...e, studentName: newName };
        }
        return e;
      });
      if (enrollChanged) {
        fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(updatedEnrollments, null, 2), 'utf-8');
      }
    }

    return { transactionsUpdated, attendanceUpdated, enrollmentsUpdated };
  }

  // ─── Notifications (Sprint 4.3) ────────────────────────────────────────────

  async getNotifications(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      return await db.collection('notifications').find({}).sort({ createdAt: -1 }).toArray();
    } else {
      const file = path.join(DATA_DIR, 'notifications.json');
      if (!fs.existsSync(file)) return [];
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch { return []; }
    }
  }

  async saveNotifications(notifications: any[]): Promise<void> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const col = db.collection('notifications');
      await col.deleteMany({});
      if (notifications.length > 0) {
        await col.insertMany(notifications);
      }
    } else {
      const file = path.join(DATA_DIR, 'notifications.json');
      fs.writeFileSync(file, JSON.stringify(notifications, null, 2), 'utf-8');
    }
  }

  async addNotification(notification: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('notifications').insertOne(notification);
      return notification;
    } else {
      const all = await this.getNotifications();
      all.unshift(notification);
      await this.saveNotifications(all);
      return notification;
    }
  }

  async updateNotification(id: string, updates: any): Promise<any | null> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      await db.collection('notifications').updateOne({ id }, { $set: updates });
      return await db.collection('notifications').findOne({ id });
    } else {
      const all = await this.getNotifications();
      const idx = all.findIndex((n: any) => n.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      await this.saveNotifications(all);
      return all[idx];
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const result = await db.collection('notifications').deleteOne({ id });
      return result.deletedCount > 0;
    } else {
      const all = await this.getNotifications();
      const filtered = all.filter((n: any) => n.id !== id);
      if (filtered.length === all.length) return false;
      await this.saveNotifications(filtered);
      return true;
    }
  }

  async markAllNotificationsRead(): Promise<number> {
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const result = await db.collection('notifications').updateMany({ isRead: false }, { $set: { isRead: true } });
      return result.modifiedCount;
    } else {
      const all = await this.getNotifications();
      let count = 0;
      all.forEach((n: any) => { if (!n.isRead) { n.isRead = true; count++; } });
      await this.saveNotifications(all);
      return count;
    }
  }

  /**
   * Generate smart notifications based on current system state.
   * Called on login or manually by user.
   */
  async generateNotifications(): Promise<any[]> {
    const students = await this.getStudents();
    const attendance = await this.getAttendance();
    const transactions = await this.getTransactions();
    const classes = await this.getClasses();
    const existing = await this.getNotifications();

    const today = new Date().toISOString().slice(0, 10);
    const todayObj = new Date();
    const dayOfWeek = todayObj.getDay(); // 0=Sun, 1=Mon...

    const genId = () => Math.random().toString(36).substring(2, 12);
    const newNotifs: any[] = [];

    // Helper: check if notification already exists (avoid duplicates)
    const existsToday = (type: string, studentId?: string) =>
      existing.some((n: any) =>
        n.type === type &&
        n.createdAt?.startsWith(today) &&
        (!studentId || n.studentId === studentId)
      );

    // 1. Fee warnings: students with sessions remaining <= 2
    for (const student of students) {
      if (!student.feePerSession || student.feePerSession <= 0) continue;
      if (student.status === 'left') continue;

      const totalPaid = transactions
        .filter((t: any) => t.studentName?.toLowerCase() === student.name?.toLowerCase() && t.revenueCategory === 'Học phí offline')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const sessionsUsed = attendance.filter((a: any) => a.studentId === student.id && a.status !== 'excused').length;
      const costUsed = sessionsUsed * student.feePerSession;
      const remaining = Math.floor((totalPaid - costUsed) / student.feePerSession);

      if (remaining <= 0 && !existsToday('fee_warning', student.id)) {
        newNotifs.push({
          id: genId(),
          type: 'fee_warning',
          title: `${student.name} đã hết buổi!`,
          message: `Đã học ${sessionsUsed} buổi, cần thu thêm học phí.`,
          icon: '🔴',
          isRead: false,
          createdAt: new Date().toISOString(),
          link: 'hoc-phi',
          studentId: student.id,
          studentName: student.name,
          priority: 'high',
        });
      } else if (remaining > 0 && remaining <= 2 && !existsToday('fee_warning', student.id)) {
        newNotifs.push({
          id: genId(),
          type: 'fee_warning',
          title: `${student.name} sắp hết buổi`,
          message: `Chỉ còn ${remaining} buổi. Nhắc phụ huynh đóng thêm.`,
          icon: '🟡',
          isRead: false,
          createdAt: new Date().toISOString(),
          link: 'hoc-phi',
          studentId: student.id,
          studentName: student.name,
          priority: 'medium',
        });
      }
    }

    // 2. Today's classes that need attendance
    const VIET_DAY_MAP: Record<number, string[]> = {
      0: ['cn', 'chủ nhật'],
      1: ['thứ 2', 't2'],
      2: ['thứ 3', 't3'],
      3: ['thứ 4', 't4'],
      4: ['thứ 5', 't5'],
      5: ['thứ 6', 't6'],
      6: ['thứ 7', 't7'],
    };
    const todayNames = VIET_DAY_MAP[dayOfWeek] || [];

    for (const cls of classes) {
      if (cls.status === 'inactive') continue;
      const days: string[] = Array.isArray(cls.scheduleDays) ? cls.scheduleDays : [];
      const hasToday = days.some((d: string) => todayNames.some(tn => d.toLowerCase().includes(tn)));

      if (hasToday) {
        // Check if attendance already taken
        const attendedToday = attendance.some((a: any) => a.date === today && a.className === cls.name);
        if (!attendedToday && !existsToday('todo', cls.id)) {
          newNotifs.push({
            id: genId(),
            type: 'todo',
            title: `Điểm danh lớp ${cls.name}`,
            message: `${cls.scheduleTime || ''} — Chưa điểm danh hôm nay.`,
            icon: '📋',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: 'diem-danh',
            priority: 'high',
          });
        }
      }
    }

    // 3. System: Welcome / daily summary
    if (!existsToday('system')) {
      const monthlyTxCount = transactions.filter((t: any) => t.paymentDate?.startsWith(today.slice(0, 7))).length;
      newNotifs.push({
        id: genId(),
        type: 'system',
        title: 'Chào buổi sáng! ☀️',
        message: `Hôm nay ${new Date().toLocaleDateString('vi-VN')}. Tháng này có ${monthlyTxCount} giao dịch.`,
        icon: '📊',
        isRead: false,
        createdAt: new Date().toISOString(),
        priority: 'low',
      });
    }

    // Save new notifications
    if (newNotifs.length > 0) {
      const all = [...newNotifs, ...existing];
      // Keep max 100 notifications
      const trimmed = all.slice(0, 100);
      await this.saveNotifications(trimmed);
    }

    return newNotifs;
  }

  // ─── Backup & Restore ──────────────────────────────────────────────────────
  async getBackupData(): Promise<any> {
    const [transactions, students, classes, attendance, settings, users, enrollments] = await Promise.all([
      this.getTransactions(),
      this.getStudents(),
      this.getClasses(),
      this.getAttendance(),
      this.getSettings(),
      this.getUsers(),
      this.getEnrollments(),
    ]);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        transactions,
        students,
        classes,
        attendance,
        settings,
        users,
        enrollments,
      },
    };
  }

  async restoreFromBackup(backup: any): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      const { data } = backup;
      if (!data) throw new Error('Dữ liệu backup không hợp lệ');

      const stats: Record<string, number> = {};

      if (this.isCloud && this.mongoClient) {
        const dbConn = this.mongoClient.db(this.dbName);

        // Clear and restore each collection
        const collections = [
          { name: 'transactions', items: data.transactions },
          { name: 'students', items: data.students },
          { name: 'classes', items: data.classes },
          { name: 'attendance', items: data.attendance },
          { name: 'users', items: data.users },
          { name: 'enrollments', items: data.enrollments },
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

        // Restore settings (object, not array)
        if (data.settings) {
          await dbConn.collection('settings').deleteMany({});
          await dbConn.collection('settings').insertOne(data.settings);
          stats['settings'] = 1;
        }
      } else {
        // Local file restore
        if (data.transactions) {
          fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data.transactions, null, 2), 'utf-8');
          stats['transactions'] = data.transactions.length;
        }
        if (data.students) {
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify(data.students, null, 2), 'utf-8');
          stats['students'] = data.students.length;
        }
        if (data.classes) {
          fs.writeFileSync(CLASSES_FILE, JSON.stringify(data.classes, null, 2), 'utf-8');
          stats['classes'] = data.classes.length;
        }
        if (data.attendance) {
          fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(data.attendance, null, 2), 'utf-8');
          stats['attendance'] = data.attendance.length;
        }
        if (data.users) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(data.users, null, 2), 'utf-8');
          stats['users'] = data.users.length;
        }
        if (data.enrollments) {
          fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(data.enrollments, null, 2), 'utf-8');
          stats['enrollments'] = data.enrollments.length;
        }
        if (data.settings) {
          fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data.settings, null, 2), 'utf-8');
          stats['settings'] = 1;
        }
      }

      return { success: true, message: 'Khôi phục dữ liệu thành công!', stats };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi khôi phục dữ liệu', stats: {} };
    }
  }

  // ─── Staff Management ─────────────────────────────────────────────────────────
  async getStaff(): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const list = await dbConn.collection('staff').find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(STAFF_FILE, 'utf-8');
        return JSON.parse(data);
      } catch { return []; }
    }
  }

  async createStaff(staff: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newStaff = { ...staff };
      await dbConn.collection('staff').insertOne(newStaff);
      const { _id, ...rest } = newStaff;
      return rest;
    } else {
      const list = await this.getStaff();
      list.push(staff);
      fs.writeFileSync(STAFF_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return staff;
    }
  }

  async updateStaff(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection('staff').updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection('staff').findOne({ id });
      if (!doc) throw new Error('Không tìm thấy nhân viên');
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getStaff();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Không tìm thấy nhân viên');
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      fs.writeFileSync(STAFF_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[idx];
    }
  }

  async deleteStaff(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection('staff').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getStaff();
      const filtered = list.filter(s => s.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(STAFF_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  // ─── Teaching Logs (Chấm công GV) ──────────────────────────────────────────
  async getTeachingLogs(query?: { staffId?: string; month?: string }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter: any = {};
      if (query?.staffId) filter.staffId = query.staffId;
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      const list = await dbConn.collection('teaching_logs').find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(TEACHING_LOGS_FILE, 'utf-8');
        let list = JSON.parse(data);
        if (query?.staffId) list = list.filter((l: any) => l.staffId === query.staffId);
        if (query?.month) list = list.filter((l: any) => l.date.startsWith(query.month));
        return list.sort((a: any, b: any) => b.date.localeCompare(a.date));
      } catch { return []; }
    }
  }

  async createTeachingLog(log: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newLog = { ...log };
      await dbConn.collection('teaching_logs').insertOne(newLog);
      const { _id, ...rest } = newLog;
      return rest;
    } else {
      const list = await this.getTeachingLogs();
      list.push(log);
      fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return log;
    }
  }

  async deleteTeachingLog(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection('teaching_logs').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(TEACHING_LOGS_FILE, 'utf-8');
        const list = JSON.parse(data);
        const filtered = list.filter((l: any) => l.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(TEACHING_LOGS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
      } catch { return false; }
    }
  }

  // ─── Salary Advances (Ứng lương) ──────────────────────────────────────────
  async getSalaryAdvances(query?: { staffId?: string; month?: string }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter: any = {};
      if (query?.staffId) filter.staffId = query.staffId;
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      const list = await dbConn.collection('salary_advances').find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(SALARY_ADVANCES_FILE, 'utf-8');
        let list = JSON.parse(data);
        if (query?.staffId) list = list.filter((a: any) => a.staffId === query.staffId);
        if (query?.month) list = list.filter((a: any) => a.date.startsWith(query.month));
        return list.sort((a: any, b: any) => b.date.localeCompare(a.date));
      } catch { return []; }
    }
  }

  async createSalaryAdvance(advance: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newAdv = { ...advance };
      await dbConn.collection('salary_advances').insertOne(newAdv);
      const { _id, ...rest } = newAdv;
      return rest;
    } else {
      const list = await this.getSalaryAdvances();
      list.push(advance);
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return advance;
    }
  }

  async updateSalaryAdvance(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection('salary_advances').updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection('salary_advances').findOne({ id });
      if (!doc) throw new Error('Không tìm thấy khoản ứng');
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getSalaryAdvances();
      const idx = list.findIndex((a: any) => a.id === id);
      if (idx === -1) throw new Error('Không tìm thấy khoản ứng');
      list[idx] = { ...list[idx], ...updates };
      fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[idx];
    }
  }

  async deleteSalaryAdvance(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection('salary_advances').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(SALARY_ADVANCES_FILE, 'utf-8');
        const list = JSON.parse(data);
        const filtered = list.filter((a: any) => a.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(SALARY_ADVANCES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
      } catch { return false; }
    }
  }

  // ─── Monthly Salaries (Bảng lương tháng) ───────────────────────────────────
  async getMonthlySalaries(query?: { month?: string; staffId?: string }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter: any = {};
      if (query?.month) filter.month = query.month;
      if (query?.staffId) filter.staffId = query.staffId;
      const list = await dbConn.collection('monthly_salaries').find(filter).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(MONTHLY_SALARIES_FILE, 'utf-8');
        let list = JSON.parse(data);
        if (query?.month) list = list.filter((s: any) => s.month === query.month);
        if (query?.staffId) list = list.filter((s: any) => s.staffId === query.staffId);
        return list;
      } catch { return []; }
    }
  }

  async createOrUpdateMonthlySalary(salary: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const existing = await dbConn.collection('monthly_salaries').findOne({
        staffId: salary.staffId,
        month: salary.month,
      });
      if (existing) {
        await dbConn.collection('monthly_salaries').updateOne(
          { staffId: salary.staffId, month: salary.month },
          { $set: salary }
        );
      } else {
        await dbConn.collection('monthly_salaries').insertOne({ ...salary });
      }
      const doc = await dbConn.collection('monthly_salaries').findOne({
        staffId: salary.staffId,
        month: salary.month,
      });
      if (!doc) return salary;
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getMonthlySalaries();
      const idx = list.findIndex((s: any) => s.staffId === salary.staffId && s.month === salary.month);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...salary };
      } else {
        list.push(salary);
      }
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return idx >= 0 ? list[idx] : salary;
    }
  }

  async updateMonthlySalaryStatus(id: string, status: string): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection('monthly_salaries').updateOne({ id }, { $set: { status } });
      const doc = await dbConn.collection('monthly_salaries').findOne({ id });
      if (!doc) throw new Error('Không tìm thấy bảng lương');
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getMonthlySalaries();
      const idx = list.findIndex((s: any) => s.id === id);
      if (idx === -1) throw new Error('Không tìm thấy bảng lương');
      list[idx].status = status;
      fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[idx];
    }
  }

  async deleteMonthlySalary(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection('monthly_salaries').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      try {
        const data = fs.readFileSync(MONTHLY_SALARIES_FILE, 'utf-8');
        const list = JSON.parse(data);
        const filtered = list.filter((s: any) => s.id !== id);
        if (list.length === filtered.length) return false;
        fs.writeFileSync(MONTHLY_SALARIES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
      } catch { return false; }
    }
  }

  // Calculate monthly salary for a staff member
  async calculateMonthlySalary(staffId: string, month: string): Promise<any> {
    const staffList = await this.getStaff();
    const staff = staffList.find((s: any) => s.id === staffId);
    if (!staff) throw new Error('Không tìm thấy nhân viên');

    const teachingLogs = await this.getTeachingLogs({ staffId, month });
    const advances = await this.getSalaryAdvances({ staffId, month });

    const totalSessions = teachingLogs.reduce((sum: number, l: any) => sum + (l.sessions || 1), 0);
    const teachingIncome = staff.role === 'teacher' ? totalSessions * staff.ratePerSession : 0;
    const totalAdvance = advances.reduce((sum: number, a: any) => sum + a.amount, 0);

    // Existing salary for this month (to preserve otherIncome, kpiDeduction, notes)
    const existingSalaries = await this.getMonthlySalaries({ staffId, month });
    const existing = existingSalaries[0];

    const otherIncome = existing?.otherIncome ?? 0;
    const kpiDeduction = existing?.kpiDeduction ?? 0;
    const baseSalary = staff.baseSalary || 0;

    // Thành tiền = teaching + baseSalary + other - KPI
    const grossSalary = teachingIncome + baseSalary + otherIncome - kpiDeduction;
    const taxRate = 0.10;
    const taxAmount = Math.round(grossSalary * taxRate);

    // Advance carry-over: nếu ứng nhiều hơn lương khả dụng,
    // chỉ trừ tối đa = lương khả dụng, phần dư carry-over sang tháng sau
    const payableAmount = grossSalary - taxAmount; // Lương khả dụng sau thuế
    const advanceApplied = Math.min(totalAdvance, Math.max(payableAmount, 0)); // Trừ tối đa = lương
    const advanceCarryOver = totalAdvance - advanceApplied; // Phần dư → tháng sau
    const netSalary = Math.max(payableAmount - advanceApplied, 0); // Luôn >= 0

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
      status: existing?.status || 'draft',
      notes: existing?.notes || (advanceCarryOver > 0 ? `⚠️ Ứng vượt lương: ${advanceCarryOver.toLocaleString('vi-VN')}đ chuyển sang tháng sau` : ''),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    return await this.createOrUpdateMonthlySalary(salary);
  }

  // ─── Expense Management (Quản lý Chi phí) ──────────────────────────────────
  private EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');

  async getExpenses(query?: { month?: string; category?: string }): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const filter: any = {};
      if (query?.month) {
        filter.date = { $regex: `^${query.month}` };
      }
      if (query?.category) filter.category = query.category;
      const list = await dbConn.collection('expenses').find(filter).sort({ date: -1 }).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        const data = fs.readFileSync(this.EXPENSES_FILE, 'utf-8');
        let list = JSON.parse(data);
        if (query?.month) list = list.filter((e: any) => e.date?.startsWith(query.month));
        if (query?.category) list = list.filter((e: any) => e.category === query.category);
        return list.sort((a: any, b: any) => b.date.localeCompare(a.date));
      } catch { return []; }
    }
  }

  async createExpense(expense: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const newExpense = { ...expense };
      await dbConn.collection('expenses').insertOne(newExpense);
      const { _id, ...rest } = newExpense;
      return rest;
    } else {
      const list = await this.getExpenses();
      list.push(expense);
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return expense;
    }
  }

  async updateExpense(id: string, updates: any): Promise<any> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection('expenses').updateOne({ id }, { $set: updates });
      const doc = await dbConn.collection('expenses').findOne({ id });
      if (!doc) throw new Error('Không tìm thấy khoản chi');
      const { _id, ...rest } = doc;
      return rest;
    } else {
      const list = await this.getExpenses();
      const idx = list.findIndex(e => e.id === id);
      if (idx === -1) throw new Error('Không tìm thấy khoản chi');
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return list[idx];
    }
  }

  async deleteExpense(id: string): Promise<boolean> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const res = await dbConn.collection('expenses').deleteOne({ id });
      return (res.deletedCount ?? 0) > 0;
    } else {
      const list = await this.getExpenses();
      const filtered = list.filter(e => e.id !== id);
      if (list.length === filtered.length) return false;
      fs.writeFileSync(this.EXPENSES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      return true;
    }
  }

  // ─── Audit Logs ─────────────────────────────────────────────────────────────
  private AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit_logs.json');

  async getAuditLogs(limit: number = 200): Promise<any[]> {
    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      const logs = await dbConn.collection('audit_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      return logs.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(this.AUDIT_LOG_FILE)) return [];
        const data = fs.readFileSync(this.AUDIT_LOG_FILE, 'utf-8');
        const logs = JSON.parse(data);
        return logs.slice(0, limit);
      } catch {
        return [];
      }
    }
  }

  async addAuditLog(entry: { action: string; entity: string; entityId?: string; details?: string; user: string }): Promise<void> {
    const log = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ...entry,
      timestamp: new Date().toISOString(),
    };

    if (this.isCloud && this.mongoClient) {
      const dbConn = this.mongoClient.db(this.dbName);
      await dbConn.collection('audit_logs').insertOne(log);
      // Keep max 1000 logs
      const count = await dbConn.collection('audit_logs').countDocuments();
      if (count > 1000) {
        const oldest = await dbConn.collection('audit_logs')
          .find({}).sort({ timestamp: 1 }).limit(count - 1000).toArray();
        const ids = oldest.map(o => o._id);
        await dbConn.collection('audit_logs').deleteMany({ _id: { $in: ids } });
      }
    } else {
      try {
        let logs: any[] = [];
        if (fs.existsSync(this.AUDIT_LOG_FILE)) {
          logs = JSON.parse(fs.readFileSync(this.AUDIT_LOG_FILE, 'utf-8'));
        }
        logs.unshift(log);
        // Keep max 1000 logs
        if (logs.length > 1000) logs = logs.slice(0, 1000);
        fs.writeFileSync(this.AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
      } catch {
        // silently fail
      }
    }
  }
}

export const db = new DatabaseService();

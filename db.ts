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
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const list = await db.collection('students').find({}).toArray();
      return list.map(({ _id, ...rest }) => rest);
    } else {
      try {
        if (!fs.existsSync(STUDENTS_FILE)) {
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
        const data = fs.readFileSync(STUDENTS_FILE, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Error reading students file:', error);
        return [];
      }
    }
  }

  async upsertStudent(studentName: string, className: string): Promise<any> {
    const normalizedName = studentName.trim();
    if (!normalizedName) return null;
    
    if (this.isCloud && this.mongoClient) {
      const db = this.mongoClient.db(this.dbName);
      const col = db.collection('students');
      const existing = await col.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });
      if (existing) {
        await col.updateOne({ id: existing.id }, { $set: { className, updatedAt: new Date().toISOString() } });
        return { ...existing, className };
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || '',
          feePerSession: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await col.insertOne(newStudent);
        return newStudent;
      }
    } else {
      const list = await this.getStudents();
      const existingIndex = list.findIndex(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existingIndex > -1) {
        list[existingIndex].className = className || '';
        list[existingIndex].updatedAt = new Date().toISOString();
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        return list[existingIndex];
      } else {
        const newStudent = {
          id: Math.random().toString(36).substring(2, 9),
          name: normalizedName,
          className: className || '',
          feePerSession: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
}

export const db = new DatabaseService();

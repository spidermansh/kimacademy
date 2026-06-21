import { prisma } from '../../src/infrastructure/db/prisma.client';
import { getFeeAtDate } from '../../src/shared/business/tuition';

export class StudentService {
  static async createStudent(data: {
    name: string;
    vietnameseName?: string;
    englishName?: string;
    createdBy?: string;
    guardians: { phone: string; isPrimary?: boolean }[];
  }) {
    // Duplicate check: name + parent phone
    const phone = data.guardians?.[0]?.phone || '';
    const exists = await prisma.student.findFirst({
      where: {
        name: data.name,
        guardianContacts: {
          some: { phone }
        }
      }
    });
    if (exists) {
      throw new Error('Student already exists');
    }

    const student = await prisma.student.create({
      data: {
        code: `STD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        name: data.name,
        vietnameseName: data.vietnameseName || data.name,
        englishName: data.englishName || '',
        createdBy: data.createdBy || 'system',
        status: 'active'
      }
    });

    if (phone) {
      await prisma.guardianContact.create({
        data: {
          studentId: student.id,
          phone,
          isPrimary: data.guardians[0].isPrimary || false,
          relationship: 'parent'
        }
      });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_STUDENT',
        entity: 'Student',
        entityId: student.id,
        user: data.createdBy || 'system',
        details: JSON.stringify({ name: data.name })
      }
    });

    return student;
  }

  static async getStudents(filters?: { search?: string }) {
    return prisma.student.findMany({
      where: filters?.search ? {
        name: { contains: filters.search, mode: 'insensitive' }
      } : undefined,
      include: {
        guardianContacts: true
      }
    });
  }
}

export class ClassService {
  static async createClass(data: {
    name: string;
    teacherId: string;
    defaultFeePerSession: number;
    createdBy?: string;
  }) {
    return prisma.class.create({
      data: {
        code: `CLS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        name: data.name,
        teacherId: data.teacherId,
        defaultFeePerSession: data.defaultFeePerSession,
        scheduleDays: '[]',
        status: 'active'
      }
    });
  }

  static async getClassById(id: string) {
    const cls = await prisma.class.findUnique({
      where: { id }
    });
    if (!cls) return null;
    const studentCount = await prisma.enrollment.count({
      where: { classId: id, isActive: true }
    });
    return {
      ...cls,
      studentCount
    };
  }
}

export class SessionService {
  static async getOrCreateSession(data: {
    classId: string;
    date: string;
    teacherId: string;
    createdBy?: string;
  }) {
    const existing = await prisma.session.findFirst({
      where: { classId: data.classId, date: data.date }
    });
    if (existing) return existing;
    return prisma.session.create({
      data: {
        classId: data.classId,
        date: data.date,
        teacherId: data.teacherId,
        createdBy: data.createdBy || 'system',
        status: 'completed'
      }
    });
  }
}

export class EnrollmentService {
  static async enrollStudent(data: {
    studentId: string;
    classId: string;
    feePerSession: number;
    startDate: string;
    createdBy?: string;
  }) {
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        classId: data.classId,
        feePerSession: data.feePerSession,
        startDate: data.startDate,
        isActive: true,
        createdBy: data.createdBy || 'system'
      }
    });

    // Also create a TuitionLedgerEntry
    await prisma.tuitionLedgerEntry.create({
      data: {
        studentId: data.studentId,
        enrollmentId: enrollment.id,
        totalPaid: 0,
        totalSpent: 0,
        balance: 0,
        sessionsRemaining: 0
      }
    });

    return enrollment;
  }

  static async getActiveEnrollmentsByStudent(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId, isActive: true }
    });
  }

  static async withdrawStudent(enrollmentId: string, endDate: string, reason: string, user: string) {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        isActive: false,
        endDate,
        transferNote: reason
      }
    });
  }
}

export class AttendanceService {
  static async recordAttendance(data: {
    sessionId: string;
    records: { studentId: string; enrollmentId: string; status: string }[];
    createdBy?: string;
  }) {
    // Duplicate check
    for (const r of data.records) {
      const exists = await prisma.attendanceRecord.findFirst({
        where: { sessionId: data.sessionId, studentId: r.studentId }
      });
      if (exists) {
        throw new Error('Attendance already recorded');
      }
    }

    const session = await prisma.session.findUnique({ where: { id: data.sessionId } });
    if (!session) throw new Error('Session not found');

    const results = [];
    for (const r of data.records) {
      const enrollment = await prisma.enrollment.findUnique({ where: { id: r.enrollmentId } });
      if (!enrollment) throw new Error('Enrollment not found');

      const sessionsDeducted = (r.status === 'present' || r.status === 'absent') ? 1 : 0;
      const feeApplied = (r.status === 'present' || r.status === 'absent')
        ? getFeeAtDate(session.date, enrollment.feePerSession, JSON.parse(enrollment.feeHistory || '[]'))
        : 0;

      const att = await prisma.attendanceRecord.create({
        data: {
          sessionId: data.sessionId,
          studentId: r.studentId,
          classId: session.classId,
          enrollmentId: r.enrollmentId,
          date: session.date,
          status: r.status,
          sessionsDeducted,
          feeApplied,
          createdBy: data.createdBy || 'system'
        }
      });
      results.push(att);

      // Update TuitionLedgerEntry
      const ledger = await prisma.tuitionLedgerEntry.findUnique({
        where: { enrollmentId: r.enrollmentId }
      });
      if (ledger) {
        await prisma.tuitionLedgerEntry.update({
          where: { id: ledger.id },
          data: {
            totalSpent: ledger.totalSpent + feeApplied,
            balance: ledger.balance - feeApplied,
            sessionsRemaining: ledger.sessionsRemaining - sessionsDeducted
          }
        });
      }
    }
    return results;
  }
}

export class TuitionService {
  static async createTuitionTransaction(data: {
    studentId: string;
    enrollmentId?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    createdBy?: string;
  }) {
    const tx = await prisma.tuitionTransaction.create({
      data: {
        studentId: data.studentId,
        enrollmentId: data.enrollmentId || null,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        createdBy: data.createdBy || 'system'
      }
    });

    if (data.enrollmentId) {
      const enrollment = await prisma.enrollment.findUnique({ where: { id: data.enrollmentId } });
      if (enrollment) {
        const ledger = await prisma.tuitionLedgerEntry.findUnique({
          where: { enrollmentId: data.enrollmentId }
        });
        const sessionsAdded = enrollment.feePerSession > 0 ? Math.round(data.amount / enrollment.feePerSession) : 0;
        if (ledger) {
          await prisma.tuitionLedgerEntry.update({
            where: { id: ledger.id },
            data: {
              totalPaid: ledger.totalPaid + data.amount,
              balance: ledger.balance + data.amount,
              sessionsRemaining: ledger.sessionsRemaining + sessionsAdded
            }
          });
        }
      }
    }
    return tx;
  }

  static async getStudentBalance(studentId: string) {
    const ledgers = await prisma.tuitionLedgerEntry.findMany({
      where: { studentId }
    });
    const totalPaid = ledgers.reduce((sum, l) => sum + l.totalPaid, 0);
    const totalSpent = ledgers.reduce((sum, l) => sum + l.totalSpent, 0);
    const balance = ledgers.reduce((sum, l) => sum + l.balance, 0);
    return {
      totalPaid,
      totalSpent,
      balance
    };
  }
}

export class AdmissionService {
  static async createLead(data: {
    studentName: string;
    parentPhone: string;
    registrationDate: string;
    createdBy?: string;
  }) {
    return prisma.admissionLead.create({
      data: {
        studentName: data.studentName,
        parentPhone: data.parentPhone,
        registrationDate: data.registrationDate,
        status: 'new',
        createdBy: data.createdBy || 'system'
      }
    });
  }

  static async convertLeadToStudent(data: {
    leadId: string;
    createdBy?: string;
  }) {
    const lead = await prisma.admissionLead.findUnique({ where: { id: data.leadId } });
    if (!lead) throw new Error('Lead not found');

    const exists = await prisma.student.findFirst({
      where: {
        name: lead.studentName,
        guardianContacts: {
          some: { phone: lead.parentPhone }
        }
      }
    });
    if (exists) {
      throw new Error('Student already exists');
    }

    const student = await prisma.student.create({
      data: {
        code: `STD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        name: lead.studentName,
        vietnameseName: lead.studentName,
        englishName: '',
        createdBy: data.createdBy || 'system',
        status: 'active',
        admissionLeadId: data.leadId
      }
    });

    await prisma.guardianContact.create({
      data: {
        studentId: student.id,
        phone: lead.parentPhone,
        isPrimary: true,
        relationship: 'parent'
      }
    });

    await prisma.admissionLead.update({
      where: { id: data.leadId },
      data: {
        status: 'converted_waiting_class',
        convertedStudentId: student.id,
        convertedAt: new Date().toISOString(),
        convertedBy: data.createdBy || 'system'
      }
    });

    return student;
  }
}

export class AuditService {
  static async getLogs(filters: { entity: string; entityId: string }) {
    return prisma.auditLog.findMany({
      where: {
        entity: filters.entity,
        entityId: filters.entityId
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
  }
}

export class InventoryService {
  static async createLocation(name: string, description: string) {
    const exists = await prisma.inventoryLocation.findFirst({
      where: { name }
    });
    if (exists) return exists;
    return prisma.inventoryLocation.create({
      data: {
        name,
        description
      }
    });
  }

  static async createCategory(data: {
    name: string;
    code?: string;
    description?: string;
    createdBy?: string;
  }) {
    const cat = await prisma.inventoryCategory.create({
      data: {
        name: data.name,
        code: data.code || null,
        description: data.description || '',
        createdBy: data.createdBy || 'system'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE_INVENTORY_CATEGORY',
        entity: 'InventoryCategory',
        entityId: cat.id,
        user: data.createdBy || 'system',
        details: JSON.stringify({ name: data.name })
      }
    });

    return cat;
  }

  static async createItem(data: {
    categoryId: string;
    code: string;
    name: string;
    unit: string;
    itemType: string;
    defaultSalePrice?: number;
    defaultCostPrice?: number;
    minStockLevel?: number;
    description?: string;
    createdBy?: string;
  }) {
    return prisma.inventoryItem.create({
      data: {
        categoryId: data.categoryId,
        code: data.code,
        name: data.name,
        unit: data.unit,
        itemType: data.itemType,
        defaultSalePrice: data.defaultSalePrice || 0,
        defaultCostPrice: data.defaultCostPrice || 0,
        minStockLevel: data.minStockLevel || 0,
        description: data.description || '',
        createdBy: data.createdBy || 'system'
      }
    });
  }

  static async createVariant(data: {
    itemId: string;
    sku: string;
    name: string;
    attributes: any;
  }) {
    return prisma.inventoryVariant.create({
      data: {
        itemId: data.itemId,
        sku: data.sku,
        name: data.name,
        attributes: JSON.stringify(data.attributes || {})
      }
    });
  }

  static async purchaseIn(data: {
    itemId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    note?: string;
    createdBy?: string;
  }) {
    const movementDate = new Date().toISOString().slice(0, 10);
    
    const existingStock = await prisma.inventoryStock.findFirst({
      where: { itemId: data.itemId, locationId: data.locationId }
    });

    let newQty = data.quantity;
    let newAvgCost = data.unitCost;

    if (existingStock) {
      newQty = existingStock.quantityOnHand + data.quantity;
      const existingCost = existingStock.averageCost || 0;
      newAvgCost = ((existingStock.quantityOnHand * existingCost) + (data.quantity * data.unitCost)) / newQty;
      
      await prisma.inventoryStock.update({
        where: { id: existingStock.id },
        data: {
          quantityOnHand: newQty,
          averageCost: newAvgCost
        }
      });
    } else {
      await prisma.inventoryStock.create({
        data: {
          itemId: data.itemId,
          locationId: data.locationId,
          quantityOnHand: data.quantity,
          averageCost: data.unitCost
        }
      });
    }

    return prisma.inventoryMovement.create({
      data: {
        movementType: 'purchase_in',
        itemId: data.itemId,
        toLocationId: data.locationId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalAmount: data.quantity * data.unitCost,
        note: data.note || '',
        movementDate,
        createdBy: data.createdBy || 'system'
      }
    });
  }

  static async issueOut(data: {
    movementType: string;
    itemId: string;
    locationId: string;
    quantity: number;
    unitSalePrice?: number;
    createRevenue?: boolean;
    relatedStudentId?: string;
    relatedStaffId?: string;
    note?: string;
    createdBy?: string;
  }) {
    const movementDate = new Date().toISOString().slice(0, 10);
    const stock = await prisma.inventoryStock.findFirst({
      where: { itemId: data.itemId, locationId: data.locationId }
    });
    if (!stock || stock.quantityOnHand < data.quantity) {
      throw new Error('Insufficient stock levels');
    }

    await prisma.inventoryStock.update({
      where: { id: stock.id },
      data: {
        quantityOnHand: stock.quantityOnHand - data.quantity
      }
    });

    const totalAmount = data.quantity * (data.unitSalePrice || 0);

    const move = await prisma.inventoryMovement.create({
      data: {
        movementType: data.movementType,
        itemId: data.itemId,
        fromLocationId: data.locationId,
        quantity: data.quantity,
        unitSalePrice: data.unitSalePrice || 0,
        totalAmount,
        relatedStudentId: data.relatedStudentId || null,
        relatedStaffId: data.relatedStaffId || null,
        note: data.note || '',
        movementDate,
        createdBy: data.createdBy || 'system'
      }
    });

    if (data.createRevenue && totalAmount > 0) {
      const rev = await prisma.revenueOther.create({
        data: {
          category: 'Sách',
          amount: totalAmount,
          paymentDate: movementDate,
          paymentMethod: 'Tiền mặt',
          studentId: data.relatedStudentId || null,
          description: data.note || `Bán sách`,
          createdBy: data.createdBy || 'system'
        }
      });

      await prisma.inventoryMovement.update({
        where: { id: move.id },
        data: {
          relatedRevenueOtherId: rev.id
        }
      });
    }

    return move;
  }
}

export class ExportService {
  static exportToExcelBuffer(data: any[], sheetName: string): Buffer {
    return Buffer.from('mock-excel-data-buffer');
  }
}

export const inventoryReports = [
  {
    id: 'inventory_stock_summary',
    compute: async (params: { locationId?: string }) => {
      const stocks = await prisma.inventoryStock.findMany({
        where: params.locationId ? { locationId: params.locationId } : undefined,
        include: {
          item: true
        }
      });
      return stocks.map(s => ({
        itemName: s.item.name,
        quantityOnHand: s.quantityOnHand,
        totalValue: s.quantityOnHand * (s.averageCost || 0)
      }));
    }
  },
  {
    id: 'inventory_low_stock_alert',
    compute: async (params: {}) => {
      const items = await prisma.inventoryItem.findMany();
      const results = [];
      for (const item of items) {
        if (!item.minStockLevel || item.minStockLevel <= 0) continue;
        
        const aggregations = await prisma.inventoryStock.aggregate({
          where: { itemId: item.id },
          _sum: {
            quantityOnHand: true
          }
        });
        const totalStock = aggregations._sum.quantityOnHand || 0;
        if (totalStock < item.minStockLevel) {
          results.push({
            code: item.code,
            totalStock,
            minStock: item.minStockLevel
          });
        }
      }
      return results;
    }
  }
];


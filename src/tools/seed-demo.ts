import { prisma } from '../infrastructure/db/prisma.client';
import { generateDemoData } from '../shared/generateDemoData';
import bcryptjs from 'bcryptjs';

async function main() {
  console.log('🌱 Bắt đầu dọn dẹp và nạp dữ liệu demo cho Kim Academy V3...');
  
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString().slice(0, 10);

  // 1. Dọn dẹp dữ liệu cũ (Xóa theo thứ tự ràng buộc khóa ngoại)
  console.log('🗑️  Đang dọn dẹp các bảng dữ liệu cũ...');
  
  // Inventory tables
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.inventoryVariant.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.inventoryLocation.deleteMany({});

  // Core tables
  await prisma.auditLog.deleteMany({});
  await prisma.dailyClose.deleteMany({});
  await prisma.importBatch.deleteMany({});
  await prisma.backupSnapshot.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.systemParameter.deleteMany({});
  await prisma.featureFlag.deleteMany({});

  await prisma.payrollItem.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});
  await prisma.salaryAdvance.deleteMany({});
  await prisma.assistantWorkLog.deleteMany({});
  await prisma.teachingLog.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.tuitionLedgerEntry.deleteMany({});
  await prisma.tuitionTransaction.deleteMany({});
  await prisma.revenueOther.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.guardianContact.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.staffMember.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Sinh dữ liệu demo
  const data = generateDemoData();

  // 3. Nạp người dùng (Users)
  console.log('👤 Đang nạp người dùng...');
  for (const u of data.users) {
    const hashedPassword = bcryptjs.hashSync(u.password, 10);
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        password: hashedPassword,
        name: u.name,
        role: u.role,
        staffId: u.username === 'teacher' ? 'staff_john_01' : null
      }
    });
  }

  // 4. Nạp nhân sự (StaffMember)
  console.log('💼 Đang nạp nhân viên...');
  for (const s of data.staff) {
    const cleanName = s.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    await prisma.staffMember.create({
      data: {
        id: s.id,
        code: `STAFF-${cleanName}-${s.id.slice(-4)}`,
        name: s.name,
        role: s.role,
        phone: s.phone || null,
        baseSalary: s.baseSalary,
        ratePerSession: s.ratePerSession,
        bankAccount: s.bankAccount || null,
        bankName: s.bankName || null,
        startDate: s.startDate,
        status: s.status,
        taxMethod: 'fixed_percent',
        taxMethodValue: 10.0,
        applySocialInsurance: false,
        applyHealthInsurance: false,
        applyUnemploymentInsurance: false,
        ratePerHour: s.role === 'assistant' ? 50000 : 0
      }
    });
  }

  // 5. Nạp lớp học (Class)
  console.log('🏫 Đang nạp lớp học...');
  const classIdMap = new Map<string, string>(); // className -> classId
  for (const c of data.classes) {
    // Bắt buộc teacherId hợp lệ
    let teacherId = c.teacherId;
    if (!teacherId || teacherId === '') {
      // Tìm giáo viên John Smith làm mặc định nếu thiếu giáo viên
      teacherId = 'staff_john_01';
    }
    const cleanClassName = c.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const createdClass = await prisma.class.create({
      data: {
        id: c.id,
        code: `CLASS-${cleanClassName}-${c.id.slice(-4)}`,
        name: c.name,
        type: c.type,
        teacherId: teacherId,
        room: c.room || null,
        maxStudents: c.maxStudents || 15,
        status: c.status,
        defaultFeePerSession: c.defaultFee,
        scheduleDays: JSON.stringify(c.scheduleDays),
        scheduleTime: c.scheduleTime || null,
        description: c.description || null
      }
    });
    classIdMap.set(c.name, createdClass.id);
  }

  // 6. Nạp học viên (Student) & Liên hệ (GuardianContact)
  console.log('🎓 Đang nạp học sinh & phụ huynh...');
  for (const s of data.students) {
    const cleanStudentName = s.vietnameseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const createdStudent = await prisma.student.create({
      data: {
        id: s.id,
        code: `HV-${cleanStudentName}-${s.id.slice(-4)}`,
        name: s.name,
        vietnameseName: s.vietnameseName,
        englishName: s.englishName,
        gender: s.gender || null,
        birthDate: s.birthYear ? `${s.birthYear}-01-01` : null,
        status: s.status,
        enrollDate: s.enrollDate || null,
        notes: null,
        createdBy: 'admin'
      }
    });

    // Tạo liên hệ phụ huynh
    if (s.parentPhone) {
      await prisma.guardianContact.create({
        data: {
          studentId: createdStudent.id,
          phone: s.parentPhone,
          name: s.name.split(' ').slice(0, -1).join(' ') + ' Phụ Huynh',
          isPrimary: true,
          relationship: 'parent'
        }
      });
    }
  }

  // 7. Nạp đăng ký lớp (Enrollment)
  console.log('✏️ Đang nạp đăng ký lớp...');
  const enrollmentMap = new Map<string, string>(); // studentId_classId -> enrollmentId
  for (const e of data.enrollments) {
    const classId = classIdMap.get(e.className);
    if (!classId) continue;

    const createdEnrollment = await prisma.enrollment.create({
      data: {
        id: e.id,
        studentId: e.studentId,
        classId: classId,
        feePerSession: e.feePerSession,
        startDate: e.startDate,
        isActive: e.isActive,
        createdBy: 'admin',
        feeHistory: '[]'
      }
    });
    enrollmentMap.set(`${e.studentId}_${classId}`, createdEnrollment.id);

    // Tự động tạo bản ghi TuitionLedgerEntry rỗng cho enrollment
    await prisma.tuitionLedgerEntry.create({
      data: {
        studentId: e.studentId,
        enrollmentId: createdEnrollment.id,
        totalPaid: 0,
        totalSpent: 0,
        balance: 0,
        sessionsRemaining: 0
      }
    });
  }

  // 8. Nạp chi phí vận hành (Expense)
  console.log('💸 Đang nạp chi phí...');
  for (const ex of data.expenses) {
    await prisma.expense.create({
      data: {
        id: ex.id,
        date: ex.date,
        category: ex.category,
        description: ex.description,
        amount: ex.amount,
        paymentMethod: ex.paymentMethod,
        isRecurring: ex.isRecurring || false,
        createdBy: 'admin'
      }
    });
  }

  // 9. Nạp giao dịch (Transactions & RevenueOther)
  console.log('💰 Đang nạp giao dịch tài chính...');
  for (const tx of data.transactions) {
    if (tx.revenueCategory === 'Học phí offline') {
      const classId = classIdMap.get(tx.className);
      const enrollmentId = classId ? enrollmentMap.get(`${tx.studentId}_${classId}`) : null;

      await prisma.tuitionTransaction.create({
        data: {
          id: tx.id,
          studentId: tx.studentId,
          enrollmentId: enrollmentId || null,
          amount: tx.amount,
          paymentDate: tx.paymentDate,
          paymentMethod: tx.paymentMethod,
          term: tx.notes?.includes('tháng') ? tx.notes : 'Kỳ hiện tại',
          notes: tx.notes || null,
          isReconciled: tx.isReconciled || false,
          isInvoiced: tx.isInvoiced || false,
          createdBy: 'admin',
          source: 'manual'
        }
      });

      // Cập nhật Ledger Entry nếu có enrollmentId
      if (enrollmentId) {
        const ledger = await prisma.tuitionLedgerEntry.findUnique({
          where: { enrollmentId }
        });
        if (ledger) {
          const newPaid = ledger.totalPaid + tx.amount;
          const newBalance = newPaid - ledger.totalSpent;
          const enroll = data.enrollments.find(e => e.id === enrollmentId);
          const fee = enroll ? enroll.feePerSession : tx.amount;
          const newSessions = fee > 0 ? Math.floor(newBalance / fee) : 0;

          await prisma.tuitionLedgerEntry.update({
            where: { enrollmentId },
            data: {
              totalPaid: newPaid,
              balance: newBalance,
              sessionsRemaining: newSessions,
              lastUpdatedAt: new Date()
            }
          });
        }
      }
    } else {
      // Doanh thu khác
      await prisma.revenueOther.create({
        data: {
          id: tx.id,
          category: tx.revenueCategory,
          amount: tx.amount,
          paymentDate: tx.paymentDate,
          paymentMethod: tx.paymentMethod,
          studentId: tx.studentId || null,
          description: tx.notes || null,
          isReconciled: tx.isReconciled || false,
          createdBy: 'admin'
        }
      });
    }
  }

  // 10. Tạo các buổi học (Session) và điểm danh (AttendanceRecord)
  console.log('📅 Đang nạp buổi học và điểm danh...');
  const sessionMap = new Map<string, string>(); // classId_date -> sessionId

  for (const att of data.attendance) {
    const classId = classIdMap.get(att.className);
    if (!classId) continue;

    // Tìm lớp học để lấy teacherId
    const cls = data.classes.find(c => c.name === att.className);
    const teacherId = cls?.teacherId || 'staff_john_01';

    const sessionKey = `${classId}_${att.date}`;
    let sessionId = sessionMap.get(sessionKey);

    if (!sessionId) {
      // Tạo buổi học mới
      const createdSession = await prisma.session.create({
        data: {
          classId: classId,
          date: att.date,
          teacherId: teacherId,
          status: 'completed',
          createdBy: 'admin'
        }
      });
      sessionId = createdSession.id;
      sessionMap.set(sessionKey, sessionId);
    }

    const enrollmentId = enrollmentMap.get(`${att.studentId}_${classId}`);
    if (!enrollmentId) continue;

    // Tìm đơn giá áp dụng tại ngày điểm danh
    const student = data.students.find(s => s.id === att.studentId);
    const feePerSession = student ? student.feePerSession : 100000;

    const sessionsDeducted = att.status === 'excused' ? 0 : 1;
    const feeApplied = att.status === 'excused' ? 0 : feePerSession;

    await prisma.attendanceRecord.create({
      data: {
        id: att.id,
        sessionId: sessionId,
        studentId: att.studentId,
        classId: classId,
        enrollmentId: enrollmentId,
        date: att.date,
        status: att.status,
        sessionsDeducted: sessionsDeducted,
        feeApplied: feeApplied,
        note: null,
        createdBy: 'admin',
        source: 'manual'
      }
    });

    // Cập nhật chi phí tiêu hao trong TuitionLedgerEntry
    if (sessionsDeducted > 0) {
      const ledger = await prisma.tuitionLedgerEntry.findUnique({
        where: { enrollmentId }
      });
      if (ledger) {
        const newSpent = ledger.totalSpent + feeApplied;
        const newBalance = ledger.totalPaid - newSpent;
        const newSessions = feePerSession > 0 ? Math.floor(newBalance / feePerSession) : 0;

        await prisma.tuitionLedgerEntry.update({
          where: { enrollmentId },
          data: {
            totalSpent: newSpent,
            balance: newBalance,
            sessionsRemaining: newSessions,
            lastUpdatedAt: new Date()
          }
        });
      }
    }
  }

  // 11. Nạp chấm công giảng dạy (TeachingLog)
  console.log('⏰ Đang nạp chấm công dạy của giáo viên...');
  for (const tl of data.teachingLogs) {
    const classId = classIdMap.get(tl.className);
    if (!classId) continue;

    await prisma.teachingLog.create({
      data: {
        id: tl.id,
        staffId: tl.staffId,
        date: tl.date,
        classId: classId,
        sessions: tl.sessions || 1,
        isSubstitute: tl.isSubstitute || false,
        hoursWorked: tl.hoursWorked || 1.5,
        source: tl.source || 'auto',
        note: tl.note || null
      }
    });
  }

  // 12. Nạp tạm ứng lương (SalaryAdvance)
  console.log('💸 Đang nạp tạm ứng lương...');
  for (const adv of data.advances) {
    await prisma.salaryAdvance.create({
      data: {
        id: adv.id,
        staffId: adv.staffId,
        amount: adv.amount,
        date: adv.date,
        reason: adv.reason || null,
        approvedBy: 'admin'
      }
    });
  }

  // 13. Khởi tạo một số nhà cung cấp, vị trí kho và danh mục vật tư mẫu (Mới ở V3)
  console.log('📦 Khởi tạo phân hệ Kho vật tư mẫu...');
  const location = await prisma.inventoryLocation.create({
    data: { name: 'Kho chính', description: 'Kho lưu trữ trung tâm' }
  });

  const supplier = await prisma.supplier.create({
    data: { name: 'Nhà sách Fahasa', phone: '02838225798', email: 'info@fahasa.com', address: 'TP. HCM' }
  });

  const catBooks = await prisma.inventoryCategory.create({
    data: { name: 'Sách giáo trình', code: 'BOOK', createdBy: 'admin' }
  });

  const catUniforms = await prisma.inventoryCategory.create({
    data: { name: 'Đồng phục', code: 'UNIFORM', createdBy: 'admin' }
  });

  // Tạo vật tư mẫu
  const itemBook = await prisma.inventoryItem.create({
    data: {
      categoryId: catBooks.id,
      code: 'SK-STARTER-1',
      name: 'Giáo trình Starters 1',
      unit: 'cuốn',
      itemType: 'sellable',
      defaultSalePrice: 150000,
      defaultCostPrice: 90000,
      minStockLevel: 5,
      createdBy: 'admin'
    }
  });

  const itemUniform = await prisma.inventoryItem.create({
    data: {
      categoryId: catUniforms.id,
      code: 'UN-SHIRT-M',
      name: 'Áo thun đồng phục Size M',
      unit: 'cái',
      itemType: 'sellable',
      defaultSalePrice: 100000,
      defaultCostPrice: 60000,
      minStockLevel: 10,
      createdBy: 'admin'
    }
  });

  // Tạo biến thể vật tư
  const variantBook = await prisma.inventoryVariant.create({
    data: { itemId: itemBook.id, sku: 'SK-STARTER-1-V1', name: 'Bản in 2026' }
  });

  const variantUniform = await prisma.inventoryVariant.create({
    data: { itemId: itemUniform.id, sku: 'UN-SHIRT-M-V1', name: 'Đỏ viền xanh' }
  });

  // Khởi tạo số lượng tồn
  await prisma.inventoryStock.create({
    data: { itemId: itemBook.id, variantId: variantBook.id, locationId: location.id, quantityOnHand: 50, averageCost: 90000 }
  });
  await prisma.inventoryStock.create({
    data: { itemId: itemUniform.id, variantId: variantUniform.id, locationId: location.id, quantityOnHand: 30, averageCost: 60000 }
  });

  // Ghi nhận lịch sử nhập kho
  await prisma.inventoryMovement.create({
    data: {
      movementType: 'opening',
      itemId: itemBook.id,
      variantId: variantBook.id,
      toLocationId: location.id,
      quantity: 50,
      unitCost: 90000,
      totalAmount: 4500000,
      movementDate: daysAgo(30),
      createdBy: 'admin',
      note: 'Nhập kho ban đầu'
    }
  });

  await prisma.inventoryMovement.create({
    data: {
      movementType: 'opening',
      itemId: itemUniform.id,
      variantId: variantUniform.id,
      toLocationId: location.id,
      quantity: 30,
      unitCost: 60000,
      totalAmount: 1800000,
      movementDate: daysAgo(30),
      createdBy: 'admin',
      note: 'Nhập kho ban đầu'
    }
  });

  // 14. Thiết lập các tham số cấu hình hệ thống mặc định (CFG-01 Core)
  console.log('⚙️ Đang cài đặt tham số hệ thống mặc định...');
  await prisma.systemParameter.createMany({
    data: [
      { key: 'warning_tuition_threshold', name: 'Cảnh báo nợ học phí (số buổi)', group: 'Học vụ', valueType: 'number', value: '2', unit: 'buổi', effectiveFrom: daysAgo(365), createdBy: 'admin' },
      { key: 'warning_absence_threshold', name: 'Cảnh báo vắng liên tiếp (số buổi)', group: 'Học vụ', valueType: 'number', value: '3', unit: 'buổi', effectiveFrom: daysAgo(365), createdBy: 'admin' },
      { key: 'warning_inactive_days', name: 'Cảnh báo vắng học không lý do (ngày)', group: 'Học vụ', valueType: 'number', value: '14', unit: 'ngày', effectiveFrom: daysAgo(365), createdBy: 'admin' },
      { key: 'max_students_per_class', name: 'Sĩ số tối đa mặc định', group: 'Lớp học', valueType: 'number', value: '15', unit: 'học viên', effectiveFrom: daysAgo(365), createdBy: 'admin' },
      { key: 'tax_fixed_percent', name: 'Thuế TNCN cố định (%)', group: 'Nhân sự', valueType: 'number', value: '10', unit: '%', effectiveFrom: daysAgo(365), createdBy: 'admin' }
    ]
  });

  console.log('✅ Đã nạp dữ liệu demo thành công cho Kim Academy V3!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp dữ liệu demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from '../src/infrastructure/db/prisma.client';
import bcryptjs from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding admin user...');

  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    console.log('   Admin user already exists, skipping.');
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: bcryptjs.hashSync('admin123', 10),
        name: 'Quản trị viên',
        role: 'admin'
      }
    });
    console.log('   ✅ Created admin user (admin / admin123)');
  }

  // Seed some demo data
  // 1. Staff members
  const staffCount = await prisma.staffMember.count();
  if (staffCount === 0) {
    console.log('🌱 Seeding staff members...');
    await prisma.staffMember.createMany({
      data: [
        { name: 'Cô Nguyễn Thị Kim', role: 'teacher', phone: '0901234567', baseSalary: 5000000, ratePerSession: 300000, status: 'active', startDate: '2024-01-01' },
        { name: 'Thầy Trần Văn Minh', role: 'teacher', phone: '0912345678', baseSalary: 5000000, ratePerSession: 350000, status: 'active', startDate: '2024-01-01' },
        { name: 'Cô Lê Thị Hoa', role: 'teaching_assistant', phone: '0923456789', baseSalary: 3000000, ratePerHour: 50000, status: 'active', startDate: '2024-06-01' },
      ]
    });
    console.log('   ✅ Created 3 staff members');
  }

  // 2. Classes
  const classCount = await prisma.class.count();
  if (classCount === 0) {
    console.log('🌱 Seeding classes...');
    const staff = await prisma.staffMember.findMany();
    await prisma.class.createMany({
      data: [
        { name: 'Lớp Starter A', type: 'offline', teacherId: staff[0]?.id || '', room: 'P101', maxStudents: 12, status: 'active', defaultFeePerSession: 150000, scheduleDays: '["Thứ 2","Thứ 4","Thứ 6"]', scheduleTime: '08:00-09:30' },
        { name: 'Lớp Beginner B', type: 'offline', teacherId: staff[1]?.id || '', room: 'P102', maxStudents: 12, status: 'active', defaultFeePerSession: 180000, scheduleDays: '["Thứ 3","Thứ 5","Thứ 7"]', scheduleTime: '09:30-11:00' },
        { name: 'Lớp Advanced C', type: 'offline', teacherId: staff[0]?.id || '', room: 'P201', maxStudents: 10, status: 'active', defaultFeePerSession: 250000, scheduleDays: '["Thứ 2","Thứ 4"]', scheduleTime: '14:00-15:30' },
      ]
    });
    console.log('   ✅ Created 3 classes');
  }

  // 3. Students
  const studentCount = await prisma.student.count();
  if (studentCount === 0) {
    console.log('🌱 Seeding students...');
    const classes = await prisma.class.findMany();
    const students = [
      { name: 'Nguyễn Minh Anh', vietnameseName: 'Nguyễn Minh Anh', englishName: 'Minh Anh', birthDate: '2016-03-15', status: 'active', enrollDate: '2024-09-01' },
      { name: 'Trần Gia Huy', vietnameseName: 'Trần Gia Huy', englishName: 'Gia Huy', birthDate: '2015-08-22', status: 'active', enrollDate: '2024-09-01' },
      { name: 'Lê Thị Bảo Ngọc', vietnameseName: 'Lê Thị Bảo Ngọc', englishName: 'Bảo Ngọc', birthDate: '2016-12-10', status: 'active', enrollDate: '2024-10-01' },
      { name: 'Phạm Đức Khang', vietnameseName: 'Phạm Đức Khang', englishName: 'Đức Khang', birthDate: '2015-04-05', status: 'active', enrollDate: '2024-09-15' },
      { name: 'Võ Hồng Phúc', vietnameseName: 'Võ Hồng Phúc', englishName: 'Hồng Phúc', birthDate: '2017-01-20', status: 'active', enrollDate: '2024-11-01' },
    ];

    for (const s of students) {
      const student = await prisma.student.create({ data: s });
      
      // Create guardian
      await prisma.guardianContact.create({
        data: {
          studentId: student.id,
          name: `Phụ huynh ${s.name}`,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          isPrimary: true,
          relationship: 'parent'
        }
      });

      // Enroll in class
      const classIndex = Math.floor(Math.random() * classes.length);
      const cls = classes[classIndex];
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: cls.id,
          feePerSession: cls.defaultFeePerSession,
          startDate: s.enrollDate,
          isActive: true,
          feeHistory: '[]',
          createdBy: 'seed'
        }
      });

      // Create tuition ledger
      await prisma.tuitionLedgerEntry.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment.id,
          totalPaid: 0,
          totalSpent: 0,
          balance: 0,
          sessionsRemaining: 0
        }
      });
    }
    console.log(`   ✅ Created ${students.length} students with enrollments`);
  }

  console.log('\n✨ Seed complete!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

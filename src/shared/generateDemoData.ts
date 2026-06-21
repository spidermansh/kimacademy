export function generateDemoData() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  
  // Previous month YYYY-MM
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

  // Month before last YYYY-MM
  const twoMonthsAgoDate = new Date();
  twoMonthsAgoDate.setMonth(twoMonthsAgoDate.getMonth() - 2);
  const twoMonthsAgoStr = twoMonthsAgoDate.toISOString().slice(0, 7);

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  
  // Trả về danh sách ngày học bao gồm cả hôm nay để kiểm thử Lớp học ngày hôm nay
  const getScheduleDaysWithToday = () => {
    const map: Record<number, string[]> = {
      0: ['Chủ nhật'],
      1: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      2: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
      3: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      4: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
      5: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      6: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
    };
    return map[dayOfWeek] || ['Thứ 2', 'Thứ 4', 'Thứ 6'];
  };

  const getScheduleDaysWithoutToday = () => {
    const map: Record<number, string[]> = {
      0: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      1: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
      2: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      3: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
      4: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
      5: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
      6: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
    };
    return map[dayOfWeek] || ['Thứ 3', 'Thứ 5', 'Thứ 7'];
  };

  const todayScheduleDays = getScheduleDaysWithToday();
  const nonTodayScheduleDays = getScheduleDaysWithoutToday();

  // 1. NHÂN SỰ (STAFF)
  const staff = [
    {
      id: 'staff_john_01',
      name: 'John Smith',
      role: 'teacher',
      phone: '0901234567',
      baseSalary: 5000000,
      ratePerSession: 300000,
      bankAccount: '190283748293',
      bankName: 'Techcombank',
      startDate: daysAgo(180),
      status: 'active',
      createdAt: daysAgo(180),
      updatedAt: daysAgo(180)
    },
    {
      id: 'staff_alex_02',
      name: 'Alex Johnson',
      role: 'teacher',
      phone: '0907654321',
      baseSalary: 0,
      ratePerSession: 0, // 17. Giáo viên thiếu đơn giá/buổi dạy để test cảnh báo nhân sự
      bankAccount: '1029384756',
      bankName: 'Vietcombank',
      startDate: daysAgo(90),
      status: 'active',
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90)
    },
    {
      id: 'staff_sarah_03',
      name: 'Sarah Connor',
      role: 'office',
      phone: '0901112222',
      baseSalary: 8000000,
      ratePerSession: 0,
      bankAccount: '999888777666',
      bankName: 'MB Bank',
      startDate: daysAgo(120),
      status: 'active',
      createdAt: daysAgo(120),
      updatedAt: daysAgo(120)
    },
    {
      id: 'staff_david_04',
      name: 'David Beckham',
      role: 'teacher',
      phone: '0903334444',
      baseSalary: 4000000,
      ratePerSession: 250000,
      bankAccount: '111222333444',
      bankName: 'ACB',
      startDate: daysAgo(365),
      status: 'inactive', // Nhân sự đã nghỉ việc
      createdAt: daysAgo(365),
      updatedAt: daysAgo(30)
    },
    {
      id: 'staff_emily_05',
      name: 'Emily Watson',
      role: 'teacher',
      phone: '0905556666',
      baseSalary: 6000000,
      ratePerSession: 350000,
      startDate: daysAgo(60),
      status: 'active', // Active nhưng không được phân lớp
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60)
    }
  ];

  // 2. LỚP HỌC (CLASSES) - Tổng cộng 7 lớp offline
  const classes = [
    {
      id: 'class_starters_01',
      name: 'Starters 1',
      type: 'offline' as const,
      schedule: `${todayScheduleDays.join(', ')} — 18:00`,
      teacher: 'John Smith',
      teacherId: 'staff_john_01',
      description: 'Lớp Starters cơ bản cho trẻ em',
      room: 'Phòng 101',
      maxStudents: 15,
      status: 'active' as const,
      defaultFee: 100000,
      scheduleDays: todayScheduleDays,
      scheduleTime: '18:00',
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90)
    },
    {
      id: 'class_movers_02',
      name: 'Movers 1',
      type: 'offline' as const,
      schedule: `${nonTodayScheduleDays.join(', ')} — 19:30`,
      teacher: 'John Smith',
      teacherId: 'staff_john_01',
      description: 'Lớp Movers nâng cao',
      room: 'Phòng 102',
      maxStudents: 10,
      status: 'active' as const,
      defaultFee: 120000,
      scheduleDays: nonTodayScheduleDays,
      scheduleTime: '19:30',
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60) // Lớp active nhưng KHÔNG có học viên nào
    },
    {
      id: 'class_flyers_03',
      name: 'Flyers 1',
      type: 'offline' as const,
      schedule: `${todayScheduleDays.join(', ')} — 17:30`,
      teacher: '', // 13. Lớp không giáo viên
      teacherId: '',
      description: 'Lớp ôn luyện Flyers',
      room: 'Phòng 201',
      maxStudents: 12,
      status: 'active' as const,
      defaultFee: 100000,
      scheduleDays: todayScheduleDays,
      scheduleTime: '17:30',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    {
      id: 'class_ket_04',
      name: 'KET 1',
      type: 'offline' as const,
      schedule: `${todayScheduleDays.join(', ')} — 19:00`,
      teacher: 'Alex Johnson',
      teacherId: 'staff_alex_02',
      description: 'Lớp chuẩn bị KET A2',
      room: 'Phòng 202',
      maxStudents: 3, // 12. Sĩ số tối đa nhỏ để test vượt sĩ số (có 4 học viên)
      status: 'active' as const,
      defaultFee: 120000,
      scheduleDays: todayScheduleDays,
      scheduleTime: '19:00',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(45)
    },
    {
      id: 'class_pet_05',
      name: 'PET 1',
      type: 'offline' as const,
      schedule: '', // Lớp cấu hình thiếu lịch học
      teacher: 'Alex Johnson',
      teacherId: 'staff_alex_02',
      description: 'Lớp chuẩn bị PET B1',
      room: 'Phòng 301',
      maxStudents: 15,
      status: 'active' as const,
      defaultFee: 130000,
      scheduleDays: [],
      scheduleTime: '',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(45)
    },
    {
      id: 'class_ielts_06',
      name: 'IELTS 1',
      type: 'offline' as const,
      schedule: `${todayScheduleDays.join(', ')} — 16:00`,
      teacher: 'John Smith',
      teacherId: 'staff_john_01',
      description: 'Lớp IELTS cơ bản',
      room: 'Phòng 302',
      maxStudents: 15,
      status: 'active' as const,
      defaultFee: 150000,
      scheduleDays: todayScheduleDays,
      scheduleTime: '16:00',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // 14. Lớp có lịch hôm nay nhưng chưa điểm danh
    },
    {
      id: 'class_ielts_07',
      name: 'IELTS 2',
      type: 'offline' as const,
      schedule: `${nonTodayScheduleDays.join(', ')} — 18:00`,
      teacher: 'John Smith',
      teacherId: 'staff_john_01',
      description: 'Lớp IELTS nâng cao',
      room: 'Phòng 303',
      maxStudents: 15,
      status: 'active' as const,
      defaultFee: 150000,
      scheduleDays: nonTodayScheduleDays,
      scheduleTime: '18:00',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    }
  ];

  // 3. HỌC VIÊN (STUDENTS) - Tổng cộng 23 học viên mô phỏng các tình huống cảnh báo
  const students = [
    {
      id: 'std_01',
      name: 'Nguyễn Văn An', // 9. Trùng tên với std_09 nhưng khác ID/lớp
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'Tony',
      vietAnhName: 'Nguyễn Văn An (Tony)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2017,
      parentPhone: '0912345678',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(60),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60) // 1. Còn nhiều buổi học (còn 20 buổi)
    },
    {
      id: 'std_02',
      name: 'Trần Thị B',
      vietnameseName: 'Trần Thị B',
      englishName: 'Bunny',
      vietAnhName: 'Trần Thị B (Bunny)',
      className: 'Starters 1',
      gender: 'Nữ',
      birthYear: 2017,
      parentPhone: '0912223333',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // 2. Còn đúng 2 buổi học
    },
    {
      id: 'std_03',
      name: 'Lê Văn C',
      vietnameseName: 'Lê Văn C',
      englishName: 'Charlie',
      vietAnhName: 'Lê Văn C (Charlie)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2016,
      parentPhone: '0913334444',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // 3. Còn đúng 1 buổi học
    },
    {
      id: 'std_04',
      name: 'Phạm Văn D',
      vietnameseName: 'Phạm Văn D',
      englishName: 'Daniel',
      vietAnhName: 'Phạm Văn D (Daniel)',
      className: 'Flyers 1',
      gender: 'Nam',
      birthYear: 2015,
      parentPhone: '0914445555',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // 4. Hết buổi học (còn 0 buổi)
    },
    {
      id: 'std_05',
      name: 'Hoàng Thị E',
      vietnameseName: 'Hoàng Thị E',
      englishName: 'Emily',
      vietAnhName: 'Hoàng Thị E (Emily)',
      className: 'Flyers 1',
      gender: 'Nữ',
      birthYear: 2015,
      parentPhone: '0915556666',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // 5. Âm học phí (âm -100k, nợ 1 buổi)
    },
    {
      id: 'std_06',
      name: 'Ngô Văn F',
      vietnameseName: 'Ngô Văn F',
      englishName: 'Frank',
      vietAnhName: 'Ngô Văn F (Frank)',
      className: '', // 6. Học viên hoạt động nhưng chưa được xếp lớp
      gender: 'Nam',
      birthYear: 2016,
      parentPhone: '0916667777',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(15),
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15)
    },
    {
      id: 'std_07',
      name: 'Vũ Thị G',
      vietnameseName: 'Vũ Thị G',
      englishName: 'Grace',
      vietAnhName: 'Vũ Thị G (Grace)',
      className: 'Starters 1',
      gender: 'Nữ',
      birthYear: 2017,
      parentPhone: '0917778888',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(40),
      createdAt: daysAgo(40),
      updatedAt: daysAgo(40) // 7. Không điểm danh trong 14 ngày qua (chỉ điểm danh duy nhất ngày daysAgo(20))
    },
    {
      id: 'std_08',
      name: 'Bùi Văn H',
      vietnameseName: 'Bùi Văn H',
      englishName: 'Harry',
      vietAnhName: 'Bùi Văn H (Harry)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2017,
      parentPhone: '0918889999',
      feePerSession: 100000,
      status: 'suspended' as const, // 8. Tạm nghỉ nhưng vẫn phát sinh điểm danh/giao dịch hôm nay
      enrollDate: daysAgo(50),
      createdAt: daysAgo(50),
      updatedAt: todayStr
    },
    {
      id: 'std_09',
      name: 'Nguyễn Văn An', // 9. Trùng tên với std_01 nhưng khác ID/lớp (học IELTS 2)
      vietnameseName: 'Nguyễn Văn An',
      englishName: 'Andy',
      vietAnhName: 'Nguyễn Văn An (Andy)',
      className: 'IELTS 2',
      gender: 'Nam',
      birthYear: 2008,
      parentPhone: '0919998888',
      feePerSession: 150000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20)
    },
    {
      id: 'std_10',
      name: 'Trần Văn J',
      vietnameseName: 'Trần Văn J',
      englishName: 'Jack',
      vietAnhName: 'Trần Văn J (Jack)',
      className: 'Flyers 1',
      gender: 'Nam',
      birthYear: 2015,
      parentPhone: '0911223344',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(45),
      createdAt: daysAgo(45),
      updatedAt: daysAgo(15) // 10. Đã chuyển lớp (Từ Starters 1 sang Flyers 1 ngày daysAgo(15))
    },
    {
      id: 'std_11',
      name: 'Lê Thị K',
      vietnameseName: 'Lê Thị K',
      englishName: 'Kate',
      vietAnhName: 'Lê Thị K (Kate)',
      className: 'Starters 1',
      gender: 'Nữ',
      birthYear: 2016,
      parentPhone: '0912233445',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(40),
      createdAt: daysAgo(40),
      updatedAt: daysAgo(15), // 11. Đã đổi học phí từ 80k lên 100k vào ngày daysAgo(15)
      feeHistory: [
        {
          id: 'fh_01',
          oldFee: 80000,
          newFee: 100000,
          changedAt: daysAgo(15) + 'T09:00:00.000Z',
          changedBy: 'admin',
          mode: 'prospective' as const
        }
      ]
    },
    // Các học viên còn lại của lớp KET 1 (Sỹ số tối đa 3, nhưng xếp 4 học viên active)
    {
      id: 'std_12',
      name: 'Học Viên KET 1',
      vietnameseName: 'Học Viên KET 1',
      englishName: 'Ketty 1',
      vietAnhName: 'Học Viên KET 1 (Ketty 1)',
      className: 'KET 1',
      gender: 'Nam',
      birthYear: 2013,
      parentPhone: '0912341234',
      feePerSession: 120000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    {
      id: 'std_13',
      name: 'Học Viên KET 2',
      vietnameseName: 'Học Viên KET 2',
      englishName: 'Ketty 2',
      vietAnhName: 'Học Viên KET 2 (Ketty 2)',
      className: 'KET 1',
      gender: 'Nữ',
      birthYear: 2013,
      parentPhone: '0912341235',
      feePerSession: 120000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    {
      id: 'std_14',
      name: 'Học Viên KET 3',
      vietnameseName: 'Học Viên KET 3',
      englishName: 'Ketty 3',
      vietAnhName: 'Học Viên KET 3 (Ketty 3)',
      className: 'KET 1',
      gender: 'Nam',
      birthYear: 2013,
      parentPhone: '0912341236',
      feePerSession: 120000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    {
      id: 'std_15',
      name: 'Học Viên KET 4',
      vietnameseName: 'Học Viên KET 4',
      englishName: 'Ketty 4',
      vietAnhName: 'Học Viên KET 4 (Ketty 4)',
      className: 'KET 1',
      gender: 'Nữ',
      birthYear: 2013,
      parentPhone: '0912341237',
      feePerSession: 120000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30) // KET 1 sỹ số sỹ số tối đa 3, có 4 em => Vượt sỹ số tối đa
    },
    // Học viên của PET 1 (Lớp chưa cấu hình lịch)
    {
      id: 'std_16',
      name: 'Học Viên PET 1',
      vietnameseName: 'Học Viên PET 1',
      englishName: 'Peter',
      vietAnhName: 'Học Viên PET 1 (Peter)',
      className: 'PET 1',
      gender: 'Nam',
      birthYear: 2012,
      parentPhone: '0918765432',
      feePerSession: 130000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    // Học viên của Flyers 1 (Lớp không giáo viên)
    {
      id: 'std_17',
      name: 'Học Viên Flyers 1',
      vietnameseName: 'Học Viên Flyers 1',
      englishName: 'Fiona',
      vietAnhName: 'Học Viên Flyers 1 (Fiona)',
      className: 'Flyers 1',
      gender: 'Nữ',
      birthYear: 2014,
      parentPhone: '0919876543',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    {
      id: 'std_18',
      name: 'Học Viên Flyers 2',
      vietnameseName: 'Học Viên Flyers 2',
      englishName: 'Finn',
      vietAnhName: 'Học Viên Flyers 2 (Finn)',
      className: 'Flyers 1',
      gender: 'Nam',
      birthYear: 2014,
      parentPhone: '0919876544',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(30),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30)
    },
    // Học viên lớp IELTS 1 (Lớp hôm nay chưa điểm danh)
    {
      id: 'std_19',
      name: 'Học Viên IELTS 1',
      vietnameseName: 'Học Viên IELTS 1',
      englishName: 'Ian 1',
      vietAnhName: 'Học Viên IELTS 1 (Ian 1)',
      className: 'IELTS 1',
      gender: 'Nam',
      birthYear: 2008,
      parentPhone: '0901239991',
      feePerSession: 150000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20)
    },
    {
      id: 'std_20',
      name: 'Học Viên IELTS 2',
      vietnameseName: 'Học Viên IELTS 2',
      englishName: 'Ian 2',
      vietAnhName: 'Học Viên IELTS 2 (Ian 2)',
      className: 'IELTS 1',
      gender: 'Nữ',
      birthYear: 2008,
      parentPhone: '0901239992',
      feePerSession: 150000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20)
    },
    {
      id: 'std_21',
      name: 'Học Viên IELTS 3',
      vietnameseName: 'Học Viên IELTS 3',
      englishName: 'Ian 3',
      vietAnhName: 'Học Viên IELTS 3 (Ian 3)',
      className: 'IELTS 1',
      gender: 'Nam',
      birthYear: 2007,
      parentPhone: '0901239993',
      feePerSession: 150000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20)
    },
    // Học viên IELTS 2 (Lớp bình thường)
    {
      id: 'std_22',
      name: 'Học Viên IELTS 4',
      vietnameseName: 'Học Viên IELTS 4',
      englishName: 'Ian 4',
      vietAnhName: 'Học Viên IELTS 4 (Ian 4)',
      className: 'IELTS 2',
      gender: 'Nữ',
      birthYear: 2008,
      parentPhone: '0901239994',
      feePerSession: 150000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20)
    },
    {
      id: 'std_23',
      name: 'Nguyễn Thị L',
      vietnameseName: 'Nguyễn Thị L',
      englishName: 'Lucy',
      vietAnhName: 'Nguyễn Thị L (Lucy)',
      className: 'Starters 1',
      gender: 'Nữ',
      birthYear: 2017,
      parentPhone: '0909990001',
      feePerSession: 100000,
      status: 'left' as const, // 8. Đã nghỉ học (left) nhưng phát sinh giao dịch sách hôm nay
      enrollDate: daysAgo(90),
      createdAt: daysAgo(90),
      updatedAt: todayStr
    },
    {
      id: 'std_demo_prior_month',
      name: 'Nguyễn Thị Trước',
      vietnameseName: 'Nguyễn Thị Trước',
      englishName: 'Prior',
      vietAnhName: 'Nguyễn Thị Trước (Prior)',
      className: 'Starters 1',
      gender: 'Nữ',
      birthYear: 2017,
      parentPhone: '0900000001',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(45),
      createdAt: daysAgo(45),
      updatedAt: todayStr
    },
    {
      id: 'std_demo_prepay',
      name: 'Lê Văn Trước',
      vietnameseName: 'Lê Văn Trước',
      englishName: 'Prepay',
      vietAnhName: 'Lê Văn Trước (Prepay)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2017,
      parentPhone: '0900000002',
      feePerSession: 200000,
      status: 'active' as const,
      enrollDate: daysAgo(10),
      createdAt: daysAgo(10),
      updatedAt: todayStr
    },
    {
      id: 'std_demo_exact',
      name: 'Hoàng Văn Đúng',
      vietnameseName: 'Hoàng Văn Đúng',
      englishName: 'Exact',
      vietAnhName: 'Hoàng Văn Đúng (Exact)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2017,
      parentPhone: '0900000003',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: todayStr
    },
    {
      id: 'std_demo_over',
      name: 'Phạm Văn Vượt',
      vietnameseName: 'Phạm Văn Vượt',
      englishName: 'Over',
      vietAnhName: 'Phạm Văn Vượt (Over)',
      className: 'Starters 1',
      gender: 'Nam',
      birthYear: 2017,
      parentPhone: '0900000004',
      feePerSession: 100000,
      status: 'active' as const,
      enrollDate: daysAgo(20),
      createdAt: daysAgo(20),
      updatedAt: todayStr
    }
  ];

  // 4. GIAO DỊCH (TRANSACTIONS) - Cả học phí và các khoản thu phụ trợ (Sách, Đồng phục, Lệ phí thi, Thu khác)
  const transactions = [
    // std_01: Đóng 3.000.000đ học phí offline (đã học 10 buổi -> còn 20)
    {
      id: 'tx_01',
      createdAt: daysAgo(50) + 'T10:00:00.000Z',
      paymentDate: daysAgo(50),
      studentName: 'Nguyễn Văn An',
      studentId: 'std_01',
      className: 'Starters 1',
      amount: 3000000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí khóa mới',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Nguyễn Văn An Parent'
    },
    // std_01: Mua Sách 150k
    {
      id: 'tx_01_book',
      createdAt: daysAgo(40) + 'T11:00:00.000Z',
      paymentDate: daysAgo(40),
      studentName: 'Nguyễn Văn An',
      studentId: 'std_01',
      className: 'Starters 1',
      amount: 150000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Sách',
      notes: 'Mua giáo trình Starters',
      isReconciled: true,
      isInvoiced: false,
      senderName: ''
    },
    // std_02: Đóng 500k học phí (đã học 3 buổi -> còn 2)
    {
      id: 'tx_02',
      createdAt: daysAgo(25) + 'T08:30:00.000Z',
      paymentDate: daysAgo(25),
      studentName: 'Trần Thị B',
      studentId: 'std_02',
      className: 'Starters 1',
      amount: 500000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí tháng',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Trần Văn B'
    },
    // std_02: Mua Đồng phục 100k
    {
      id: 'tx_02_uniform',
      createdAt: daysAgo(20) + 'T09:00:00.000Z',
      paymentDate: daysAgo(20),
      studentName: 'Trần Thị B',
      studentId: 'std_02',
      className: 'Starters 1',
      amount: 100000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Đồng phục',
      notes: 'Mua áo đồng phục trung tâm',
      isReconciled: true,
      isInvoiced: false,
      senderName: ''
    },
    // std_03: Đóng 500k học phí (đã học 4 buổi -> còn 1)
    {
      id: 'tx_03',
      createdAt: daysAgo(25) + 'T14:00:00.000Z',
      paymentDate: daysAgo(25),
      studentName: 'Lê Văn C',
      studentId: 'std_03',
      className: 'Starters 1',
      amount: 500000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Lê Văn C Parent'
    },
    // std_04: Đóng 500k học phí (đã học 5 buổi -> còn 0)
    {
      id: 'tx_04',
      createdAt: daysAgo(25) + 'T15:00:00.000Z',
      paymentDate: daysAgo(25),
      studentName: 'Phạm Văn D',
      studentId: 'std_04',
      className: 'Flyers 1',
      amount: 500000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí tháng 5',
      isReconciled: true,
      isInvoiced: true,
      senderName: ''
    },
    // std_05: Đóng 500k học phí (đã học 6 buổi -> còn -1, nợ học phí)
    {
      id: 'tx_05',
      createdAt: daysAgo(25) + 'T16:00:00.000Z',
      paymentDate: daysAgo(25),
      studentName: 'Hoàng Thị E',
      studentId: 'std_05',
      className: 'Flyers 1',
      amount: 500000,
      paymentMethod: 'Momo',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí qua Momo',
      isReconciled: true,
      isInvoiced: true,
      senderName: ''
    },
    // std_07: Đóng 1.000.000đ học phí (chỉ học 1 buổi rồi nghỉ 20 ngày)
    {
      id: 'tx_07',
      createdAt: daysAgo(40) + 'T10:00:00.000Z',
      paymentDate: daysAgo(40),
      studentName: 'Vũ Thị G',
      studentId: 'std_07',
      className: 'Starters 1',
      amount: 1000000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng phí học phần',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Vũ Thị G Parent'
    },
    // std_08 (suspended): Giao dịch học phí hôm nay
    {
      id: 'tx_08',
      createdAt: todayStr + 'T09:30:00.000Z',
      paymentDate: todayStr,
      studentName: 'Bùi Văn H',
      studentId: 'std_08',
      className: 'Starters 1',
      amount: 500000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí đột xuất',
      isReconciled: false, // ⚠️ Cảnh báo: giao dịch chưa đối chiếu
      isInvoiced: false,
      senderName: 'Bùi Văn H Parent'
    },
    // std_09: Nguyễn Văn An (IELTS 2): Đóng 1.200.000đ
    {
      id: 'tx_09',
      createdAt: daysAgo(10) + 'T10:00:00.000Z',
      paymentDate: daysAgo(10),
      studentName: 'Nguyễn Văn An',
      studentId: 'std_09',
      className: 'IELTS 2',
      amount: 1200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí khóa mới',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Nguyễn Văn An Parent 2'
    },
    // std_10: Đóng 1.000.000đ
    {
      id: 'tx_10',
      createdAt: daysAgo(45) + 'T10:00:00.000Z',
      paymentDate: daysAgo(45),
      studentName: 'Trần Văn J',
      studentId: 'std_10',
      className: 'Starters 1',
      amount: 1000000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí trước học',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Trần Văn J Parent'
    },
    // std_11: Đóng 800.000đ học phí offline
    {
      id: 'tx_11',
      createdAt: daysAgo(40) + 'T10:00:00.000Z',
      paymentDate: daysAgo(40),
      studentName: 'Lê Thị K',
      studentId: 'std_11',
      className: 'Starters 1',
      amount: 800000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Lê Thị K Parent'
    },
    // std_12: Đóng 1.200.000đ học phí và đóng lệ phí thi 200k
    {
      id: 'tx_12',
      createdAt: daysAgo(30) + 'T10:00:00.000Z',
      paymentDate: daysAgo(30),
      studentName: 'Học Viên KET 1',
      studentId: 'std_12',
      className: 'KET 1',
      amount: 1200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng phí học KET',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'KET Parent 1'
    },
    {
      id: 'tx_12_exam',
      createdAt: daysAgo(10) + 'T11:00:00.000Z',
      paymentDate: daysAgo(10),
      studentName: 'Học Viên KET 1',
      studentId: 'std_12',
      className: 'KET 1',
      amount: 200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Lệ phí thi',
      notes: 'Đăng ký thi Cambridge A2 KET',
      isReconciled: true,
      isInvoiced: false,
      senderName: 'KET Parent 1'
    },
    // std_13: KET 1
    {
      id: 'tx_13',
      createdAt: daysAgo(30) + 'T10:00:00.000Z',
      paymentDate: daysAgo(30),
      studentName: 'Học Viên KET 2',
      studentId: 'std_13',
      className: 'KET 1',
      amount: 1200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'KET Parent 2'
    },
    // std_14: KET 1
    {
      id: 'tx_14',
      createdAt: daysAgo(30) + 'T10:00:00.000Z',
      paymentDate: daysAgo(30),
      studentName: 'Học Viên KET 3',
      studentId: 'std_14',
      className: 'KET 1',
      amount: 1200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'KET Parent 3'
    },
    // std_15: KET 1
    {
      id: 'tx_15',
      createdAt: daysAgo(30) + 'T10:00:00.000Z',
      paymentDate: daysAgo(30),
      studentName: 'Học Viên KET 4',
      studentId: 'std_15',
      className: 'KET 1',
      amount: 1200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'KET Parent 4'
    },
    // std_23 (left): Giao dịch thu khác hôm nay 50k
    {
      id: 'tx_23_other',
      createdAt: todayStr + 'T14:00:00.000Z',
      paymentDate: todayStr,
      studentName: 'Nguyễn Thị L',
      studentId: 'std_23',
      className: 'Starters 1',
      amount: 50000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Thu khác',
      notes: 'Mua bút viết nhãn vở',
      isReconciled: true,
      isInvoiced: false,
      senderName: ''
    },
    {
      id: 'tx_demo_prior_month',
      createdAt: daysAgo(40) + 'T10:00:00.000Z',
      paymentDate: daysAgo(40),
      studentName: 'Nguyễn Thị Trước',
      studentId: 'std_demo_prior_month',
      className: 'Starters 1',
      amount: 1000000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí trước tháng',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Phụ huynh Nguyễn Thị Trước'
    },
    {
      id: 'tx_demo_prepay',
      createdAt: daysAgo(5) + 'T10:00:00.000Z',
      paymentDate: daysAgo(5),
      studentName: 'Lê Văn Trước',
      studentId: 'std_demo_prepay',
      className: 'Starters 1',
      amount: 6000000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí trước nhiều buổi',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Phụ huynh Lê Văn Trước'
    },
    {
      id: 'tx_demo_exact',
      createdAt: daysAgo(15) + 'T10:00:00.000Z',
      paymentDate: daysAgo(15),
      studentName: 'Hoàng Văn Đúng',
      studentId: 'std_demo_exact',
      className: 'Starters 1',
      amount: 500000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí vừa đủ',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Phụ huynh Hoàng Văn Đúng'
    },
    {
      id: 'tx_demo_over',
      createdAt: daysAgo(12) + 'T10:00:00.000Z',
      paymentDate: daysAgo(12),
      studentName: 'Phạm Văn Vượt',
      studentId: 'std_demo_over',
      className: 'Starters 1',
      amount: 200000,
      paymentMethod: 'Chuyển khoản',
      revenueCategory: 'Học phí offline',
      notes: 'Đóng học phí ít để học vượt',
      isReconciled: true,
      isInvoiced: true,
      senderName: 'Phụ huynh Phạm Văn Vượt'
    },
    {
      id: 'tx_demo_prior_month_book',
      createdAt: daysAgo(10) + 'T11:00:00.000Z',
      paymentDate: daysAgo(10),
      studentName: 'Nguyễn Thị Trước',
      studentId: 'std_demo_prior_month',
      className: 'Starters 1',
      amount: 150000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Sách',
      notes: 'Mua giáo trình phụ trợ',
      isReconciled: true,
      isInvoiced: false,
      senderName: ''
    },
    {
      id: 'tx_demo_prepay_uniform',
      createdAt: daysAgo(5) + 'T11:00:00.000Z',
      paymentDate: daysAgo(5),
      studentName: 'Lê Văn Trước',
      studentId: 'std_demo_prepay',
      className: 'Starters 1',
      amount: 120000,
      paymentMethod: 'Tiền mặt',
      revenueCategory: 'Đồng phục',
      notes: 'Mua đồng phục phụ trợ',
      isReconciled: true,
      isInvoiced: false,
      senderName: ''
    }
  ];

  // 5. ĐIỂM DANH (ATTENDANCE RECORDS) - Sinh điểm danh 6 tuần qua
  const attendance: any[] = [];
  const addAttendance = (id: string, date: string, studentId: string, name: string, className: string, status: 'present' | 'absent' | 'excused') => {
    attendance.push({
      id,
      date,
      studentId,
      studentName: name,
      classId: className, // Dùng className để khớp classId (phù hợp logic codebase)
      className,
      status,
      checkedBy: 'Sarah Connor',
      createdAt: date + 'T18:00:00.000Z',
      updatedAt: date + 'T18:00:00.000Z'
    });
  };

  // Starters 1 có các buổi học:
  const starters1Dates = [
    daysAgo(45), daysAgo(42), daysAgo(38), daysAgo(35), daysAgo(31), 
    daysAgo(28), daysAgo(24), daysAgo(21), daysAgo(17), daysAgo(14)
  ];
  
  starters1Dates.forEach((date, sessionIdx) => {
    // std_01: present 10 buổi
    addAttendance(`att_s1_std1_${sessionIdx}`, date, 'std_01', 'Nguyễn Văn An', 'Starters 1', 'present');
    
    // std_02: chỉ có mặt 3 buổi cuối (daysAgo(17), daysAgo(21), daysAgo(24))
    if (sessionIdx >= 6 && sessionIdx <= 8) {
      addAttendance(`att_s1_std2_${sessionIdx}`, date, 'std_02', 'Trần Thị B', 'Starters 1', 'present');
    }
    
    // std_03: có mặt 4 buổi cuối
    if (sessionIdx >= 6 && sessionIdx <= 9) {
      addAttendance(`att_s1_std3_${sessionIdx}`, date, 'std_03', 'Lê Văn C', 'Starters 1', 'present');
    }

    // std_07: chỉ có mặt duy nhất 1 buổi ngày daysAgo(20) (tương ứng daysAgo(21))
    if (sessionIdx === 7) {
      addAttendance(`att_s1_std7_${sessionIdx}`, date, 'std_07', 'Vũ Thị G', 'Starters 1', 'present');
    }

    // std_08 (suspended): có mặt các buổi trước daysAgo(15) (session 0-7)
    if (sessionIdx <= 7) {
      addAttendance(`att_s1_std8_${sessionIdx}`, date, 'std_08', 'Bùi Văn H', 'Starters 1', 'present');
    }

    // std_11: có mặt 7 buổi (2 buổi trước change và 5 buổi sau change)
    if (sessionIdx >= 2) {
      addAttendance(`att_s1_std11_${sessionIdx}`, date, 'std_11', 'Lê Thị K', 'Starters 1', 'present');
    }

    // std_demo_prior_month: session 6 (excused), 7 (absent), 8 (present), 9 (present)
    if (sessionIdx === 6) {
      addAttendance(`att_s1_std_prior_excused`, date, 'std_demo_prior_month', 'Nguyễn Thị Trước', 'Starters 1', 'excused');
    } else if (sessionIdx === 7) {
      addAttendance(`att_s1_std_prior_absent`, date, 'std_demo_prior_month', 'Nguyễn Thị Trước', 'Starters 1', 'absent');
    } else if (sessionIdx === 8 || sessionIdx === 9) {
      addAttendance(`att_s1_std_prior_present_${sessionIdx}`, date, 'std_demo_prior_month', 'Nguyễn Thị Trước', 'Starters 1', 'present');
    }

    // std_demo_prepay: session 9 (present)
    if (sessionIdx === 9) {
      addAttendance(`att_s1_std_prepay_present`, date, 'std_demo_prepay', 'Lê Văn Trước', 'Starters 1', 'present');
    }

    // std_demo_exact: session 5, 6, 7, 8, 9 (present)
    if (sessionIdx >= 5 && sessionIdx <= 9) {
      addAttendance(`att_s1_std_exact_present_${sessionIdx}`, date, 'std_demo_exact', 'Hoàng Văn Đúng', 'Starters 1', 'present');
    }

    // std_demo_over: session 7, 8, 9 (present)
    if (sessionIdx >= 7 && sessionIdx <= 9) {
      addAttendance(`att_s1_std_over_present_${sessionIdx}`, date, 'std_demo_over', 'Phạm Văn Vượt', 'Starters 1', 'present');
    }
  });

  // Điểm danh hôm nay cho học viên tạm nghỉ Bùi Văn H (std_08) để kích hoạt cảnh báo rủi ro số 8
  addAttendance(`att_s1_std8_today`, todayStr, 'std_08', 'Bùi Văn H', 'Starters 1', 'present');

  // Flyers 1 có các buổi học:
  const flyers1Dates = [
    daysAgo(24), daysAgo(21), daysAgo(17), daysAgo(14), daysAgo(10), daysAgo(7)
  ];
  flyers1Dates.forEach((date, sessionIdx) => {
    // std_04: present 5 buổi (session 0-4)
    if (sessionIdx <= 4) {
      addAttendance(`att_f1_std4_${sessionIdx}`, date, 'std_04', 'Phạm Văn D', 'Flyers 1', 'present');
    }
    // std_05: present 6 buổi (session 0-5)
    addAttendance(`att_f1_std5_${sessionIdx}`, date, 'std_05', 'Hoàng Thị E', 'Flyers 1', 'present');

    // std_10 (transferred): có mặt ở Flyers 1 từ ngày daysAgo(14) (sessionIdx 3-5)
    if (sessionIdx >= 3) {
      addAttendance(`att_f1_std10_${sessionIdx}`, date, 'std_10', 'Trần Văn J', 'Flyers 1', 'present');
    }
  });

  // std_10 (transferred): Điểm danh ở Starters 1 trước khi chuyển lớp
  const startersDatesForJack = [daysAgo(42), daysAgo(38), daysAgo(35), daysAgo(31)];
  startersDatesForJack.forEach((date, idx) => {
    addAttendance(`att_s1_std10_${idx}`, date, 'std_10', 'Trần Văn J', 'Starters 1', 'present');
  });

  // Điểm danh lớp Flyers 1 hôm nay (Lớp Flyers 1 không giáo viên)
  addAttendance(`att_f1_std17_today`, todayStr, 'std_17', 'Học Viên Flyers 1', 'Flyers 1', 'present');
  addAttendance(`att_f1_std18_today`, todayStr, 'std_18', 'Học Viên Flyers 2', 'Flyers 1', 'present');
  // Chú ý: Hôm nay Flyers 1 đã điểm danh (ở trên) nhưng KHÔNG có TeachingLog nào được tạo. Điều này kích hoạt cảnh báo rủi ro số 18.

  // Học viên std_09 (Nguyễn Văn An, IELTS 2) vắng học nhiều (>= 3 buổi vắng)
  addAttendance(`att_s2_std9_abs1`, daysAgo(10), 'std_09', 'Nguyễn Văn An', 'IELTS 2', 'absent');
  addAttendance(`att_s2_std9_abs2`, daysAgo(8), 'std_09', 'Nguyễn Văn An', 'IELTS 2', 'absent');
  addAttendance(`att_s2_std9_abs3`, daysAgo(6), 'std_09', 'Nguyễn Văn An', 'IELTS 2', 'absent');

  // 6. CHẤM CÔNG GIÁO VIÊN (TEACHING LOGS)
  const teachingLogs: any[] = [];
  
  // Tạo log chấm công cho John Smith (Starters 1 dạy trong quá khứ)
  starters1Dates.forEach((date, idx) => {
    teachingLogs.push({
      id: `tlog_s1_${idx}`,
      date,
      classId: 'class_starters_01',
      className: 'Starters 1',
      staffId: 'staff_john_01',
      staffName: 'John Smith',
      sessions: 1,
      ratePerSession: 300000,
      amount: 300000,
      isAutoGenerated: true,
      createdAt: date + 'T19:30:00.000Z',
      updatedAt: date + 'T19:30:00.000Z'
    });
  });

  // John Smith cũng dạy Flyers 1 trong quá khứ (sessionIdx 0-5)
  flyers1Dates.forEach((date, idx) => {
    teachingLogs.push({
      id: `tlog_f1_${idx}`,
      date,
      classId: 'class_flyers_03',
      className: 'Flyers 1',
      staffId: 'staff_john_01',
      staffName: 'John Smith',
      sessions: 1,
      ratePerSession: 300000,
      amount: 300000,
      isAutoGenerated: true,
      createdAt: date + 'T19:30:00.000Z',
      updatedAt: date + 'T19:30:00.000Z'
    });
  });

  // Điểm danh hôm nay của Starters 1 (John Smith dạy) => Có điểm danh và có chấm công dạy
  addAttendance(`att_s1_std1_today`, todayStr, 'std_01', 'Nguyễn Văn An', 'Starters 1', 'present');
  teachingLogs.push({
    id: `tlog_s1_today`,
    date: todayStr,
    classId: 'class_starters_01',
    className: 'Starters 1',
    staffId: 'staff_john_01',
    staffName: 'John Smith',
    sessions: 1,
    ratePerSession: 300000,
    amount: 300000,
    isAutoGenerated: true,
    createdAt: todayStr + 'T19:30:00.000Z',
    updatedAt: todayStr + 'T19:30:00.000Z'
  });

  // 7. YÊU CẦU ỨNG LƯƠNG (SALARY ADVANCES)
  const advances = [
    // Sarah Connor ứng lương bình thường tháng trước
    {
      id: 'adv_last_month_01',
      staffId: 'staff_sarah_03',
      staffName: 'Sarah Connor',
      amount: 2000000,
      date: daysAgo(35),
      reason: 'Tiêu dùng gia đình',
      status: 'approved' as const,
      approvedBy: 'admin',
      approvedAt: daysAgo(35),
      createdAt: daysAgo(35),
      updatedAt: daysAgo(35)
    },
    // 19. Sarah Connor ứng 9.000.000đ tháng này (BaseSalary: 8tr, thực lĩnh 7.2tr => Ứng lương vượt lương khả dụng)
    {
      id: 'adv_01',
      staffId: 'staff_sarah_03',
      staffName: 'Sarah Connor',
      amount: 9000000,
      date: todayStr,
      reason: 'Mua xe máy mới',
      status: 'approved' as const,
      approvedBy: 'admin',
      approvedAt: todayStr,
      createdAt: todayStr,
      updatedAt: todayStr
    }
  ];

  // 8. BẢNG LƯƠNG THÁNG (MONTHLY SALARIES) - 1 bảng lương tháng trước
  const salaries = [
    {
      id: `sal_${lastMonthStr}_staff_john_01`,
      month: lastMonthStr,
      staffId: 'staff_john_01',
      staffName: 'John Smith',
      role: 'teacher',
      baseSalary: 5000000,
      ratePerSession: 300000,
      totalSessions: 12, // Dạy 12 buổi
      teachingIncome: 3600000,
      otherIncome: 200000,
      kpiDeduction: 0,
      grossSalary: 8800000,
      tax: 880000,
      totalAdvance: 0,
      netSalary: 7920000,
      status: 'paid' as const,
      paidAt: daysAgo(10),
      notes: 'Đã thanh toán chuyển khoản'
    }
  ];

  // 9. CHI PHÍ VẬN HÀNH (EXPENSES)
  const expenses = [
    // Chi phí thuê mặt bằng tháng trước 5.000.000đ
    {
      id: 'exp_last_month_01',
      date: daysAgo(35),
      category: 'Mặt bằng',
      description: 'Tiền thuê mặt bằng trung tâm tháng trước',
      amount: 5000000,
      paymentMethod: 'Chuyển khoản',
      isRecurring: true,
      approvedBy: 'admin',
      createdBy: 'Sarah Connor',
      createdAt: new Date(daysAgo(35)).toISOString(),
      updatedAt: new Date(daysAgo(35)).toISOString()
    },
    // 15. Khoản chi lớn hơn 2.000.000đ hôm nay (8.000.000đ)
    // 16. Rent expense tăng từ 5M lên 8M (Tăng 60% > 30% MoM)
    {
      id: 'exp_02',
      date: todayStr,
      category: 'Mặt bằng',
      description: 'Tiền thuê mặt bằng trung tâm tháng này',
      amount: 8000000,
      paymentMethod: 'Chuyển khoản',
      isRecurring: true,
      approvedBy: 'admin',
      createdBy: 'Sarah Connor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Khoản chi thiếu mô tả hoặc thiếu người duyệt hôm nay để test cảnh báo tài chính
    {
      id: 'exp_03',
      date: todayStr,
      category: 'Văn phòng phẩm',
      description: '', // Thiếu mô tả
      amount: 150000,
      paymentMethod: 'Tiền mặt',
      approvedBy: '', // Thiếu người duyệt
      createdBy: 'Sarah Connor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // 10. ENROLLMENTS (LỊCH SỬ HỌC VIÊN ĐĂNG KÝ LỚP)
  const enrollments = students.map(s => ({
    id: `enr_${s.id}`,
    studentId: s.id,
    studentName: s.name,
    className: s.className || 'Chưa xếp lớp',
    feePerSession: s.feePerSession,
    startDate: s.enrollDate || todayStr,
    isActive: s.status === 'active' && s.className !== '',
    createdAt: s.createdAt
  }));

  // Ghi đè lịch sử enrollment đặc biệt cho Trần Văn J (std_10 - đã chuyển lớp)
  enrollments.push({
    id: `enr_std_10_old`,
    studentId: 'std_10',
    studentName: 'Trần Văn J',
    className: 'Starters 1',
    feePerSession: 100000,
    startDate: daysAgo(45),
    isActive: false, // Lớp cũ đã ngưng hoạt động
    createdAt: daysAgo(45)
  });

  // 11. CÀI ĐẶT (SETTINGS) - Sạch hoàn toàn "Học phí online"
  const settings = {
    centerName: 'Kim Academy',
    logoUrl: '',
    phone: '0901234567',
    address: '123 Đường Lớn, Quận 1, TP. HCM',
    feeTypes: [
      'Học phí offline',
      'Sách',
      'Đồng phục',
      'Lệ phí thi',
      'Thu khác'
    ],
    paymentMethods: [
      'Chuyển khoản',
      'Tiền mặt',
      'Momo',
      'ZaloPay',
      'Khác'
    ],
    expenseCategories: [
      'Mặt bằng',
      'Điện nước',
      'Internet',
      'Dụng cụ học tập',
      'Marketing/Quảng cáo',
      'Văn phòng phẩm',
      'Chi khác'
    ]
  };

  // 12. TÀI KHOẢN NGƯỜI DÙNG (USERS)
  const users = [
    { id: '1', username: 'ketoan', password: 'password123', name: 'Nguyễn Kế Toán', role: 'admin' },
    { id: '2', username: 'nvvp', password: 'password123', name: 'Nguyễn Minh Anh', role: 'staff' },
    { id: '3', username: 'admin', password: 'password123', name: 'Quản Trị Viên', role: 'admin' },
    { id: '4', username: 'teacher', password: 'password123', name: 'John Smith', role: 'teacher' }
  ];

  return {
    students,
    classes,
    transactions: transactions.map(t => ({ ...t, studyType: 'Trực tiếp' as const })),
    attendance,
    enrollments,
    staff,
    teachingLogs,
    advances,
    salaries,
    expenses,
    settings,
    users
  };
}

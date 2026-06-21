import { prisma } from '../src/infrastructure/db/prisma.client';

async function main() {
  console.log('🏁 Bắt đầu di chuyển dữ liệu trạng thái tuyển sinh (migrate-leads)...');
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const leads = await prisma.admissionLead.findMany();
  console.log(`🔍 Tìm thấy ${leads.length} hồ sơ tuyển sinh trong database.`);

  let updatedCount = 0;

  for (const lead of leads) {
    let newStatus = lead.status;
    let updateData: any = {};

    // 1. Ánh xạ các trạng thái Mới đăng ký / Đã liên hệ sang Đã hẹn test
    if (lead.status === 'new' || lead.status === 'new_registration' || lead.status === 'contacted') {
      newStatus = 'test_scheduled';
      updateData.status = 'test_scheduled';
      // Nếu chưa có lịch test thì điền mặc định là hôm nay lúc 18:00
      if (!lead.testScheduleDate) {
        updateData.testScheduleDate = todayStr;
        updateData.testScheduleTime = '18:00';
        updateData.testAssignee = lead.testAssignee || 'Chưa gán';
      }
    } 
    // 2. Ánh xạ Nhận học viên (accepted) sang Nhận chờ xếp lớp (accepted_waiting_class)
    else if (lead.status === 'accepted') {
      newStatus = 'accepted_waiting_class';
      updateData.status = 'accepted_waiting_class';
    } 
    // 3. Ánh xạ trạng thái converted (Đã chuyển đổi) sang chờ lớp hoặc xếp lớp chính thức
    else if (lead.status === 'converted') {
      if (lead.convertedStudentId) {
        // Tìm xem học viên này có đăng ký lớp nào không
        const enrollment = await prisma.enrollment.findFirst({
          where: { studentId: lead.convertedStudentId, isActive: true }
        });

        if (enrollment) {
          newStatus = 'converted_assigned_class';
          updateData.status = 'converted_assigned_class';
          updateData.assignedClassId = enrollment.classId;
        } else {
          newStatus = 'converted_waiting_class';
          updateData.status = 'converted_waiting_class';
        }
      } else {
        newStatus = 'converted_waiting_class';
        updateData.status = 'converted_waiting_class';
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.admissionLead.update({
        where: { id: lead.id },
        data: updateData
      });
      updatedCount++;
      console.log(`   ✅ Cập nhật lead ${lead.leadCode || lead.id} (${lead.studentName}): ${lead.status} -> ${newStatus}`);
    }
  }

  console.log(`\n🎉 Hoàn thành di chuyển dữ liệu! Đã cập nhật ${updatedCount}/${leads.length} bản ghi.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Lỗi di chuyển dữ liệu:', err);
  process.exit(1);
});

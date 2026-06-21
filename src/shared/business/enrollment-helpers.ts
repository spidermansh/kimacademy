import { Student, Enrollment, AttendanceRecord } from '../types';

/**
 * Lấy danh sách lớp active của HV
 */
export function getActiveClassNames(studentId: string, enrollments: Enrollment[]): string[] {
  return enrollments
    .filter(e => e.studentId === studentId && e.isActive)
    .map(e => e.className);
}

/**
 * HV có thuộc lớp X không?
 */
export function isStudentInClass(studentId: string, className: string, enrollments: Enrollment[]): boolean {
  return enrollments.some(e => e.studentId === studentId && e.className === className && e.isActive);
}

/**
 * Lấy fee/buổi của HV tại lớp X
 */
export function getFeeForClass(
  studentId: string,
  className: string,
  enrollments: Enrollment[],
  student: Student
): number {
  const activeEnrollment = enrollments.find(
    e => e.studentId === studentId && e.className === className && e.isActive
  );
  return activeEnrollment ? activeEnrollment.feePerSession : student.feePerSession;
}

/**
 * Lấy danh sách HV thuộc lớp X (thay thế s.className filter)
 */
export function getStudentsInClass(
  className: string,
  enrollments: Enrollment[],
  students: Student[]
): Student[] {
  return students
    .filter(s => isStudentInClass(s.id, className, enrollments))
    .map(s => populateStudentEnrollment(s, enrollments));
}

/**
 * Gán thêm các thuộc tính derived classNames và activeEnrollments cho Student
 */
export function populateStudentEnrollment(student: Student, enrollments: Enrollment[]): Student {
  const active = enrollments.filter(e => e.studentId === student.id && e.isActive);
  return {
    ...student,
    classNames: active.map(e => e.className),
    activeEnrollments: active,
    className: active.length > 0 ? active[0].className : student.className
  };
}

/**
 * Derive student.className từ enrollments
 */
export function deriveClassName(studentId: string, enrollments: Enrollment[]): string {
  const active = enrollments.filter(e => e.studentId === studentId && e.isActive);
  return active.length > 0 ? active[0].className : '';
}

/**
 * Resolve fee theo enrollment cho attendance record
 */
export function resolveAttendanceFee(
  record: AttendanceRecord,
  enrollments: Enrollment[],
  student: Student
): number {
  // Tìm enrollment phù hợp với studentId, className và date
  const match = enrollments.find(e => {
    if (e.studentId !== record.studentId || e.className !== record.className) {
      return false;
    }
    const recordDate = record.date;
    const isAfterStart = recordDate >= e.startDate;
    const isBeforeEnd = !e.endDate || recordDate <= e.endDate;
    return isAfterStart && isBeforeEnd;
  });

  if (match) {
    return match.feePerSession;
  }

  // Fallback 1: Tìm enrollment active hiện tại của lớp này
  const currentActive = enrollments.find(
    e => e.studentId === record.studentId && e.className === record.className && e.isActive
  );
  if (currentActive) {
    return currentActive.feePerSession;
  }

  // Fallback 2: Trả về fee mặc định của học sinh
  return student.feePerSession;
}

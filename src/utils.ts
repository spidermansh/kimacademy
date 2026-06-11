export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateString: string, includeTime: boolean = false): string {
  if (!dateString) return "";
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit', month: '2-digit', year: 'numeric',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Intl.DateTimeFormat('vi-VN', options).format(new Date(dateString));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Helpers for Session Token & Cloud API
const TOKEN_KEY = 'kim_academy_token';
const USER_KEY = 'kim_academy_user';

export const auth = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser(): { username: string; name: string; role: string } | null {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  setUser(user: { username: string; name: string; role: string }) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

// Common request helper with Authorization header
async function request(url: string, options: RequestInit = {}) {
  const token = auth.getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    auth.clearToken();
    // Don't reload immediately to avoid infinite loops, let the App component handle logout
    throw new Error('Hết phiên đăng nhập. Vui lòng đăng nhập lại.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Yêu cầu không thành công');
  }
  return data;
}

export const api = {
  async getTransactions(): Promise<any[]> {
    return request('/api/transactions');
  },
  async createTransaction(transaction: any): Promise<any> {
    return request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },
  async updateTransaction(id: string, transaction: any): Promise<any> {
    return request(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  },
  async deleteTransaction(id: string): Promise<any> {
    return request(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },
  async toggleReconciled(id: string, isReconciled: boolean): Promise<any> {
    return request(`/api/transactions/${id}/reconcile`, {
      method: 'PATCH',
      body: JSON.stringify({ isReconciled }),
    });
  },
  async toggleInvoiced(id: string, isInvoiced: boolean): Promise<any> {
    return request(`/api/transactions/${id}/invoice`, {
      method: 'PATCH',
      body: JSON.stringify({ isInvoiced }),
    });
  },
  async getUsers(): Promise<any[]> {
    return request('/api/users');
  },
  async createUser(user: any): Promise<any> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },
  async updateUser(id: string, user: any): Promise<any> {
    return request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },
  async deleteUser(id: string): Promise<any> {
    return request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },
  async getStudents(): Promise<any[]> {
    return request('/api/students');
  },
  async createStudent(student: any): Promise<any> {
    return request('/api/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  },
  async createStudentsBatch(students: any[]): Promise<any[]> {
    return request('/api/students/batch', {
      method: 'POST',
      body: JSON.stringify({ students }),
    });
  },
  async updateStudent(id: string, student: any): Promise<any> {
    return request(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(student),
    });
  },
  async deleteStudent(id: string): Promise<any> {
    return request(`/api/students/${id}`, {
      method: 'DELETE',
    });
  },
  // Classes
  async getClasses(): Promise<any[]> {
    return request('/api/classes');
  },
  async createClass(cls: any): Promise<any> {
    return request('/api/classes', {
      method: 'POST',
      body: JSON.stringify(cls),
    });
  },
  async updateClass(id: string, cls: any): Promise<any> {
    return request(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cls),
    });
  },
  async deleteClass(id: string): Promise<any> {
    return request(`/api/classes/${id}`, {
      method: 'DELETE',
    });
  },
  // Attendance
  async getAttendance(filters?: { date?: string; classId?: string; studentId?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.classId) params.set('classId', filters.classId);
    if (filters?.studentId) params.set('studentId', filters.studentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/attendance${query}`);
  },
  async saveAttendanceBatch(records: any[], teacherInfo?: {
    teacherId?: string; teacherName?: string; isSubstitute?: boolean;
    originalTeacherId?: string; originalTeacherName?: string; classId?: string;
  }): Promise<any[]> {
    return request('/api/attendance/batch', {
      method: 'POST',
      body: JSON.stringify({ records, ...(teacherInfo || {}) }),
    });
  },
  async deleteAttendance(id: string): Promise<any> {
    return request(`/api/attendance/${id}`, {
      method: 'DELETE',
    });
  },
  // Enrollments
  async getEnrollments(filters?: { studentId?: string; className?: string; isActive?: boolean }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.studentId) params.set('studentId', filters.studentId);
    if (filters?.className) params.set('className', filters.className);
    if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/enrollments${query}`);
  },
  async createEnrollment(enrollment: any): Promise<any> {
    return request('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify(enrollment),
    });
  },
  async transferClass(payload: {
    studentId: string;
    studentName: string;
    newClassName: string;
    newFeePerSession: number;
    transferDate: string;
    transferNote?: string;
  }): Promise<any> {
    return request('/api/enrollments/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // Settings
  async getSettings(): Promise<any> {
    return request('/api/settings');
  },
  async updateSettings(settings: any): Promise<any> {
    return request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
  // Notifications (Sprint 4.3)
  async getNotifications(): Promise<any[]> {
    return request('/api/notifications');
  },
  async markNotificationRead(id: string): Promise<any> {
    return request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },
  async markAllNotificationsRead(): Promise<any> {
    return request('/api/notifications/read-all', { method: 'PATCH' });
  },
  async deleteNotification(id: string): Promise<any> {
    return request(`/api/notifications/${id}`, { method: 'DELETE' });
  },
  async generateNotifications(): Promise<any[]> {
    return request('/api/notifications/generate', { method: 'POST' });
  },
  // Backup & Restore (Sprint 5.3)
  async getBackupData(): Promise<any> {
    return request('/api/backup');
  },
  async restoreFromBackup(backupData: any): Promise<any> {
    return request('/api/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
  },
  // Audit Logs (Sprint 5.3)
  async getAuditLogs(limit: number = 200): Promise<any[]> {
    return request(`/api/audit-logs?limit=${limit}`);
  },

  // ═══ STAFF MODULE ═══════════════════════════════════════════════════════════
  // Staff CRUD
  async getStaff(): Promise<any[]> {
    return request('/api/staff');
  },
  async createStaff(data: any): Promise<any> {
    return request('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateStaff(id: string, data: any): Promise<any> {
    return request(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteStaff(id: string): Promise<any> {
    return request(`/api/staff/${id}`, { method: 'DELETE' });
  },

  // Teaching Logs (Chấm công GV)
  async getTeachingLogs(query?: { staffId?: string; month?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.staffId) params.set('staffId', query.staffId);
    if (query?.month) params.set('month', query.month);
    const qs = params.toString();
    return request(`/api/teaching-logs${qs ? `?${qs}` : ''}`);
  },
  async createTeachingLog(data: any): Promise<any> {
    return request('/api/teaching-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteTeachingLog(id: string): Promise<any> {
    return request(`/api/teaching-logs/${id}`, { method: 'DELETE' });
  },

  // Salary Advances (Ứng lương)
  async getSalaryAdvances(query?: { staffId?: string; month?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.staffId) params.set('staffId', query.staffId);
    if (query?.month) params.set('month', query.month);
    const qs = params.toString();
    return request(`/api/salary-advances${qs ? `?${qs}` : ''}`);
  },
  async createSalaryAdvance(data: any): Promise<any> {
    return request('/api/salary-advances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateSalaryAdvance(id: string, data: any): Promise<any> {
    return request(`/api/salary-advances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteSalaryAdvance(id: string): Promise<any> {
    return request(`/api/salary-advances/${id}`, { method: 'DELETE' });
  },

  // Monthly Salaries (Bảng lương)
  async getMonthlySalaries(query?: { month?: string; staffId?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.month) params.set('month', query.month);
    if (query?.staffId) params.set('staffId', query.staffId);
    const qs = params.toString();
    return request(`/api/monthly-salaries${qs ? `?${qs}` : ''}`);
  },
  async calculateMonthlySalaries(month: string): Promise<any[]> {
    return request('/api/monthly-salaries/calculate', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  },
  async updateMonthlySalaryStatus(id: string, status: string): Promise<any> {
    return request(`/api/monthly-salaries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  async updateMonthlySalary(id: string, data: any): Promise<any> {
    return request(`/api/monthly-salaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export function numberToVietnameseWords(num: number): string {
  if (num === 0) return 'Không đồng';

  const units = ['', ' nghìn', ' triệu', ' tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, showZeroHundred: boolean): string {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let res = '';

    if (hundred > 0 || showZeroHundred) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
    } else if (ten === 1) {
      res += 'mười ';
    } else if (ten === 0 && unit > 0 && (hundred > 0 || showZeroHundred)) {
      res += 'lẻ ';
    }

    if (unit > 0) {
      if (unit === 1 && ten > 1) {
        res += 'mốt';
      } else if (unit === 5 && ten > 0) {
        res += 'lăm';
      } else if (unit === 4 && ten > 1) {
        res += 'tư';
      } else {
        res += digits[unit];
      }
    }

    return res.trim();
  }

  let strNum = Math.floor(num).toString();
  let groups: string[] = [];
  while (strNum.length > 0) {
    groups.push(strNum.substring(Math.max(0, strNum.length - 3)));
    strNum = strNum.substring(0, Math.max(0, strNum.length - 3));
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    let n = parseInt(groups[i], 10);
    if (n > 0) {
      let groupWords = readThreeDigits(n, i < groups.length - 1);
      let unitName = units[i % 4];
      if (i > 0 && i % 4 === 0) {
        unitName = ' tỷ';
      }
      words += groupWords + unitName + ' ';
    }
  }

  words = words.trim();
  if (!words) return 'Không đồng';
  
  return words.charAt(0).toUpperCase() + words.slice(1) + ' đồng.';
}


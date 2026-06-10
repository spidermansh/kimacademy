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
  }
};

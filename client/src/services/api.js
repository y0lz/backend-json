class ApiService {
  constructor() {
    // Определяем базовый URL в зависимости от окружения
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-domain.railway.app/api'  // Замените на ваш домен Railway
      : '/api'
    this.token = localStorage.getItem('token')
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getHeaders(),
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error)
      throw error
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async delete(endpoint) {
    console.log('API delete method called with endpoint:', endpoint)
    const fullUrl = `${this.baseURL}${endpoint}`
    console.log('Full DELETE URL:', fullUrl)
    return this.request(endpoint, { method: 'DELETE' })
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  // Auth
  async login(telegramId, hashKey) {
    const response = await this.post('/auth/login', { telegramId, hashKey })
    if (response.token) {
      this.setToken(response.token)
    }
    return response
  }

  async getMe() {
    return this.get('/auth/me')
  }

  // Users
  async getUsers() {
    return this.get('/users')
  }

  async createUser(userData) {
    console.log('API createUser called with:', userData)
    try {
      const result = await this.post('/users', userData)
      console.log('API createUser result:', result)
      return result
    } catch (error) {
      console.error('API createUser error:', error)
      
      // Обрабатываем специальные ошибки очереди
      if (error.message.includes('Слишком много попыток') || 
          error.message.includes('Сервер перегружен') ||
          error.message.includes('Превышено время ожидания')) {
        throw new Error(`⏳ ${error.message}`)
      }
      
      throw error
    }
  }

  async updateUser(id, userData) {
    return this.put(`/users/${id}`, userData)
  }

  async deleteUser(id) {
    console.log('API deleteUser called with id:', id)
    const url = `/users/${id}`
    console.log('DELETE URL:', url)
    try {
      const result = await this.delete(url)
      console.log('API deleteUser result:', result)
      return result
    } catch (error) {
      console.error('API deleteUser error:', error)
      throw error
    }
  }

  // Branches
  async getBranches() {
    return this.get('/branches')
  }

  // Shifts
  async getTodayShifts(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : ''
    return this.get(`/shifts/today${params}`)
  }

  async createShift(shiftData) {
    return this.post('/shifts', shiftData)
  }

  async addUserToShift(userId) {
    return this.post('/shifts/add-user', { userId })
  }

  async checkUserHasShift(userId) {
    return this.get(`/shifts/user/${userId}/has-shift`)
  }

  async deleteShift(shiftId) {
    return this.delete(`/shifts/${shiftId}`)
  }

  // Assignments
  async getTodayAssignments(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : ''
    return this.get(`/assignments/today${params}`)
  }

  async createAssignment(assignmentData) {
    return this.post('/assignments', assignmentData)
  }

  async updateAssignment(id, assignmentData) {
    return this.put(`/assignments/${id}`, assignmentData)
  }

  async deleteAssignment(id) {
    return this.delete(`/assignments/${id}`)
  }

  // Available resources
  async getAvailableCouriers(date, branchId) {
    return this.get(`/assignments/couriers/available?date=${date}&branchId=${branchId}`)
  }

  async getAvailablePassengers(date, branchId) {
    return this.get(`/assignments/passengers/available?date=${date}&branchId=${branchId}`)
  }

  // Storage and sync info
  async getStorageInfo() {
    return this.get('/sync/info')
  }

  async switchStorage(storage) {
    return this.post('/sync/switch-storage', { storage })
  }

  async fullSync() {
    return this.post('/sync/full-sync')
  }

  // Supabase specific
  async getSupabaseStatus() {
    return this.get('/supabase/status')
  }

  async testSupabaseConnection() {
    return this.post('/supabase/test')
  }

  async migrateToSupabase() {
    return this.post('/sync/migrate-to-supabase')
  }

  // Debug
  async getDebugData() {
    return this.get('/debug/data')
  }

  // Queue monitoring
  async getQueueStats() {
    return this.get('/queue/stats')
  }
}

export default new ApiService()
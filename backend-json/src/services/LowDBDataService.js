const { Low } = require('lowdb')
const { JSONFile } = require('lowdb/node')
const path = require('path')
const fs = require('fs').promises

class LowDBDataService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data')
    this.dailyDir = path.join(this.dataDir, 'daily')
    
    // Инициализация баз данных
    this.databases = {}
    this.isInitialized = false
  }

  async initialize() {
    try {
      console.log('🔄 Инициализация LowDB Data Service...')
      
      // Создаем директории
      await this.ensureDirectories()
      
      // Инициализируем базы данных
      await this.initializeDatabases()
      
      this.isInitialized = true
      console.log('✅ LowDB Data Service инициализирован')
      
      return true
    } catch (error) {
      console.error('❌ Ошибка инициализации LowDB:', error.message)
      return false
    }
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      await fs.mkdir(this.dailyDir, { recursive: true })
    } catch (error) {
      console.log('Directories already exist or created')
    }
  }

  async initializeDatabases() {
    // Основные коллекции
    const collections = ['users', 'branches', 'shifts', 'assignments', 'config']
    
    for (const collection of collections) {
      const filePath = path.join(this.dataDir, `${collection}.json`)
      const adapter = new JSONFile(filePath)
      const db = new Low(adapter, []) // По умолчанию пустой массив
      
      await db.read()
      
      // Если файл пустой или не существует, инициализируем
      if (db.data === null) {
        db.data = collection === 'config' ? {} : []
        await db.write()
      }
      
      this.databases[collection] = db
    }
    
    console.log(`📊 Инициализировано баз данных: ${collections.length}`)
  }

  // Получение базы данных
  getDB(collection) {
    if (!this.isInitialized) {
      throw new Error('LowDB Service не инициализирован')
    }
    
    const db = this.databases[collection]
    if (!db) {
      throw new Error(`База данных '${collection}' не найдена`)
    }
    
    return db
  }

  // === ПОЛЬЗОВАТЕЛИ ===
  
  async getUsers() {
    const db = this.getDB('users')
    await db.read()
    return db.data || []
  }

  async getUserById(id) {
    const db = this.getDB('users')
    await db.read()
    return db.data.find(user => user.id === id) || null
  }

  async getUserByTelegramId(telegramId) {
    const db = this.getDB('users')
    await db.read()
    return db.data.find(user => user.telegramId === telegramId.toString()) || null
  }

  async addUser(userData) {
    const db = this.getDB('users')
    await db.read()
    
    const newUser = {
      id: `user_${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString()
    }
    
    db.data.push(newUser)
    await db.write()
    
    console.log(`✅ Пользователь добавлен: ${newUser.id}`)
    return newUser
  }

  async updateUser(id, updates) {
    const db = this.getDB('users')
    await db.read()
    
    const userIndex = db.data.findIndex(user => user.id === id)
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    db.data[userIndex] = { ...db.data[userIndex], ...updates }
    await db.write()
    
    console.log(`✅ Пользователь обновлен: ${id}`)
    return db.data[userIndex]
  }

  async deleteUser(userId) {
    console.log('LowDBDataService.deleteUser called with userId:', userId)
    
    const usersDB = this.getDB('users')
    const shiftsDB = this.getDB('shifts')
    const assignmentsDB = this.getDB('assignments')
    
    // Читаем все данные
    await Promise.all([
      usersDB.read(),
      shiftsDB.read(),
      assignmentsDB.read()
    ])
    
    // Находим пользователя
    const userIndex = usersDB.data.findIndex(user => user.id === userId)
    if (userIndex === -1) {
      console.log('User not found:', userId)
      throw new Error('User not found')
    }
    
    console.log('Found user at index:', userIndex, 'User:', usersDB.data[userIndex])
    
    // Удаляем связанные смены
    console.log('Deleting related shifts...')
    const originalShiftsCount = shiftsDB.data.length
    shiftsDB.data = shiftsDB.data.filter(shift => shift.userId !== userId)
    const removedShifts = originalShiftsCount - shiftsDB.data.length
    console.log('Shifts updated, removed:', removedShifts)
    
    // Удаляем связанные назначения
    console.log('Deleting related assignments...')
    const originalAssignmentsCount = assignmentsDB.data.length
    assignmentsDB.data = assignmentsDB.data.filter(assignment => 
      assignment.courierId !== userId && assignment.passengerId !== userId
    )
    const removedAssignments = originalAssignmentsCount - assignmentsDB.data.length
    console.log('Assignments updated, removed:', removedAssignments)
    
    // Удаляем пользователя
    console.log('Deleting user...')
    usersDB.data.splice(userIndex, 1)
    
    // Сохраняем все изменения
    await Promise.all([
      usersDB.write(),
      shiftsDB.write(),
      assignmentsDB.write()
    ])
    
    console.log('✅ User deleted successfully')
    return true
  }

  // === ФИЛИАЛЫ ===
  
  async getBranches() {
    const db = this.getDB('branches')
    await db.read()
    return db.data || []
  }

  // === СМЕНЫ ===
  
  async getAllShifts() {
    const db = this.getDB('shifts')
    await db.read()
    return db.data || []
  }

  async getTodayShifts(branchId = null) {
    const db = this.getDB('shifts')
    await db.read()
    
    const today = new Date().toISOString().split('T')[0]
    let shifts = db.data.filter(shift => shift.date === today)
    
    if (branchId) {
      shifts = shifts.filter(shift => shift.branchId === branchId)
    }
    
    return shifts
  }

  async addShift(shiftData) {
    const db = this.getDB('shifts')
    await db.read()
    
    const newShift = {
      id: `shift_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...shiftData,
      createdAt: new Date().toISOString()
    }
    
    db.data.push(newShift)
    await db.write()
    
    console.log(`✅ Смена добавлена: ${newShift.id}`)
    return newShift
  }

  async updateShift(id, updates) {
    const db = this.getDB('shifts')
    await db.read()
    
    const shiftIndex = db.data.findIndex(shift => shift.id === id)
    if (shiftIndex === -1) {
      throw new Error('Shift not found')
    }

    db.data[shiftIndex] = { ...db.data[shiftIndex], ...updates }
    await db.write()
    
    console.log(`✅ Смена обновлена: ${id}`)
    return db.data[shiftIndex]
  }

  async deleteShift(shiftId) {
    console.log('LowDBDataService.deleteShift called with shiftId:', shiftId)
    
    const shiftsDB = this.getDB('shifts')
    const assignmentsDB = this.getDB('assignments')
    const usersDB = this.getDB('users')
    
    // Читаем данные
    await Promise.all([
      shiftsDB.read(),
      assignmentsDB.read(),
      usersDB.read()
    ])
    
    // Находим смену
    const shiftIndex = shiftsDB.data.findIndex(shift => shift.id === shiftId)
    if (shiftIndex === -1) {
      throw new Error('Shift not found')
    }
    
    const shift = shiftsDB.data[shiftIndex]
    const user = usersDB.data.find(u => u.id === shift.userId)
    
    // Находим затронутые назначения
    const affectedAssignments = assignmentsDB.data.filter(assignment => 
      assignment.courierId === shift.userId || assignment.passengerId === shift.userId
    )
    
    console.log(`Found ${affectedAssignments.length} affected assignments`)
    
    // Удаляем смену
    shiftsDB.data.splice(shiftIndex, 1)
    await shiftsDB.write()
    
    console.log('✅ Shift deleted successfully')
    return { 
      success: true, 
      user: user,
      affectedAssignments: affectedAssignments 
    }
  }

  async hasUserShiftToday(userId) {
    const db = this.getDB('shifts')
    await db.read()
    
    const today = new Date().toISOString().split('T')[0]
    return db.data.some(shift => shift.userId === userId && shift.date === today)
  }

  async resetAllShifts() {
    const db = this.getDB('shifts')
    await db.read()
    
    const originalCount = db.data.length
    db.data = []
    await db.write()
    
    console.log(`✅ Все смены сброшены (удалено: ${originalCount})`)
    return originalCount
  }

  async syncUserDataWithShifts() {
    const shiftsDB = this.getDB('shifts')
    const usersDB = this.getDB('users')
    
    await Promise.all([shiftsDB.read(), usersDB.read()])
    
    let syncCount = 0
    
    for (const shift of shiftsDB.data) {
      const user = usersDB.data.find(u => u.id === shift.userId)
      if (user) {
        let updated = false
        
        if (shift.fullName !== user.fullName) {
          shift.fullName = user.fullName
          updated = true
        }
        
        if (shift.branchId !== user.branchId) {
          shift.branchId = user.branchId
          updated = true
        }
        
        if (updated) {
          syncCount++
        }
      }
    }
    
    if (syncCount > 0) {
      await shiftsDB.write()
      console.log(`✅ Синхронизировано смен: ${syncCount}`)
    }
    
    return syncCount
  }

  // === НАЗНАЧЕНИЯ ===
  
  async getAllAssignments() {
    const db = this.getDB('assignments')
    await db.read()
    return db.data || []
  }

  async getTodayAssignments(branchId = null) {
    const db = this.getDB('assignments')
    await db.read()
    
    const today = new Date().toISOString().split('T')[0]
    let assignments = db.data.filter(assignment => assignment.date === today)
    
    if (branchId) {
      assignments = assignments.filter(assignment => assignment.branchId === branchId)
    }
    
    return assignments
  }

  async getAssignmentById(id) {
    const db = this.getDB('assignments')
    await db.read()
    return db.data.find(assignment => assignment.id === id) || null
  }

  async addAssignment(assignmentData) {
    const db = this.getDB('assignments')
    await db.read()
    
    const newAssignment = {
      id: `assignment_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'assigned',
      ...assignmentData,
      createdAt: new Date().toISOString()
    }
    
    db.data.push(newAssignment)
    await db.write()
    
    console.log(`✅ Назначение добавлено: ${newAssignment.id}`)
    return newAssignment
  }

  async updateAssignment(id, updates) {
    const db = this.getDB('assignments')
    await db.read()
    
    const assignmentIndex = db.data.findIndex(assignment => assignment.id === id)
    if (assignmentIndex === -1) {
      throw new Error('Assignment not found')
    }

    db.data[assignmentIndex] = { ...db.data[assignmentIndex], ...updates }
    await db.write()
    
    console.log(`✅ Назначение обновлено: ${id}`)
    return db.data[assignmentIndex]
  }

  async deleteAssignment(assignmentId) {
    const db = this.getDB('assignments')
    await db.read()
    
    const assignmentIndex = db.data.findIndex(assignment => assignment.id === assignmentId)
    if (assignmentIndex === -1) {
      throw new Error('Assignment not found')
    }
    
    db.data.splice(assignmentIndex, 1)
    await db.write()
    
    console.log(`✅ Назначение удалено: ${assignmentId}`)
    return true
  }

  // === ДОСТУПНЫЕ РЕСУРСЫ ===
  
  async getAvailableCouriers(date, branchId = null) {
    const shiftsDB = this.getDB('shifts')
    const usersDB = this.getDB('users')
    
    await Promise.all([shiftsDB.read(), usersDB.read()])
    
    // Получаем курьеров на смене
    let shifts = shiftsDB.data.filter(shift => 
      shift.date === date && shift.isWorking
    )
    
    if (branchId) {
      shifts = shifts.filter(shift => shift.branchId === branchId)
    }
    
    // Получаем данные пользователей
    const couriers = []
    for (const shift of shifts) {
      const user = usersDB.data.find(u => u.id === shift.userId)
      if (user && user.role === 'courier') {
        couriers.push({
          ...user,
          shiftId: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime
        })
      }
    }
    
    return couriers
  }

  async getAvailablePassengers(date, branchId = null) {
    const shiftsDB = this.getDB('shifts')
    const usersDB = this.getDB('users')
    
    await Promise.all([shiftsDB.read(), usersDB.read()])
    
    // Получаем пассажиров на смене
    let shifts = shiftsDB.data.filter(shift => 
      shift.date === date && shift.isWorking
    )
    
    if (branchId) {
      shifts = shifts.filter(shift => shift.branchId === branchId)
    }
    
    // Получаем данные пользователей
    const passengers = []
    for (const shift of shifts) {
      const user = usersDB.data.find(u => u.id === shift.userId)
      if (user && user.role === 'passenger') {
        passengers.push({
          ...user,
          shiftId: shift.id,
          startTime: shift.startTime,
          endTime: shift.endTime
        })
      }
    }
    
    return passengers
  }

  // === КОНФИГУРАЦИЯ ===
  
  async getConfig() {
    const db = this.getDB('config')
    await db.read()
    return db.data || {}
  }

  async updateConfig(updates) {
    const db = this.getDB('config')
    await db.read()
    
    db.data = { ...db.data, ...updates }
    await db.write()
    
    console.log('✅ Конфигурация обновлена')
    return db.data
  }

  // === СТАТИСТИКА ===
  
  async getStats() {
    const [users, shifts, assignments, branches] = await Promise.all([
      this.getUsers(),
      this.getAllShifts(),
      this.getAllAssignments(),
      this.getBranches()
    ])
    
    const today = new Date().toISOString().split('T')[0]
    const todayShifts = shifts.filter(s => s.date === today)
    const todayAssignments = assignments.filter(a => a.date === today)
    
    return {
      users: {
        total: users.length,
        couriers: users.filter(u => u.role === 'courier').length,
        passengers: users.filter(u => u.role === 'passenger').length
      },
      shifts: {
        total: shifts.length,
        today: todayShifts.length,
        active: todayShifts.filter(s => s.isWorking).length
      },
      assignments: {
        total: assignments.length,
        today: todayAssignments.length,
        completed: todayAssignments.filter(a => a.status === 'completed').length
      },
      branches: branches.length
    }
  }

  // === УТИЛИТЫ ===
  
  isReady() {
    return this.isInitialized
  }

  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(this.dataDir, 'backups', timestamp)
    
    await fs.mkdir(backupDir, { recursive: true })
    
    const collections = Object.keys(this.databases)
    for (const collection of collections) {
      const db = this.databases[collection]
      await db.read()
      
      const backupPath = path.join(backupDir, `${collection}.json`)
      await fs.writeFile(backupPath, JSON.stringify(db.data, null, 2))
    }
    
    console.log(`✅ Backup создан: ${backupDir}`)
    return backupDir
  }
}

module.exports = LowDBDataService
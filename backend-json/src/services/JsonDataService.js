const fs = require('fs').promises
const path = require('path')
const lockfile = require('proper-lockfile')

class JsonDataService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data')
    this.dailyDir = path.join(this.dataDir, 'daily')
    this.ensureDirectories()
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
      await fs.mkdir(this.dailyDir, { recursive: true })
    } catch (error) {
      console.log('Directories already exist or created')
    }
  }

  // Безопасное чтение JSON файла
  async readJsonFile(filePath, defaultValue = null) {
    try {
      const data = await fs.readFile(filePath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT' && defaultValue !== null) {
        return defaultValue
      }
      throw error
    }
  }

  // Безопасная запись JSON файла с блокировкой
  async writeJsonFile(filePath, data) {
    try {
      const release = await lockfile.lock(filePath + '.lock')
      try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
      } finally {
        await release()
      }
    } catch (error) {
      // Если блокировка не удалась, попробуем записать без неё
      console.warn('Lock failed, writing without lock:', error.message)
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    }
  }

  // === ПОЛЬЗОВАТЕЛИ ===
  async getUsers() {
    const filePath = path.join(this.dataDir, 'users.json')
    return await this.readJsonFile(filePath, [])
  }

  async getUserById(id) {
    const users = await this.getUsers()
    return users.find(user => user.id === id)
  }

  async getUserByTelegramId(telegramId) {
    const users = await this.getUsers()
    return users.find(user => user.telegramId === telegramId.toString())
  }

  async addUser(userData) {
    const users = await this.getUsers()
    const newUser = {
      id: `user_${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString()
    }
    users.push(newUser)
    
    const filePath = path.join(this.dataDir, 'users.json')
    await this.writeJsonFile(filePath, users)
    return newUser
  }

  async updateUser(id, updates) {
    const users = await this.getUsers()
    const userIndex = users.findIndex(user => user.id === id)
    
    if (userIndex === -1) {
      throw new Error('User not found')
    }

    users[userIndex] = { ...users[userIndex], ...updates }
    
    const filePath = path.join(this.dataDir, 'users.json')
    await this.writeJsonFile(filePath, users)
    return users[userIndex]
  }

  async deleteUser(userId) {
    console.log('JsonDataService.deleteUser called with userId:', userId)
    const filePath = path.join(this.dataDir, 'users.json')
    const users = await this.readJsonFile(filePath, [])
    
    const userIndex = users.findIndex(user => user.id === userId)
    if (userIndex === -1) {
      console.log('User not found:', userId)
      throw new Error('User not found')
    }
    
    console.log('Found user at index:', userIndex, 'User:', users[userIndex])
    
    // Удаляем связанные смены
    console.log('Deleting related shifts...')
    const shiftsPath = path.join(this.dataDir, 'shifts.json')
    const shifts = await this.readJsonFile(shiftsPath, [])
    const updatedShifts = shifts.filter(shift => shift.userId !== userId)
    await this.writeJsonFile(shiftsPath, updatedShifts)
    console.log('Shifts updated, removed:', shifts.length - updatedShifts.length)
    
    // Удаляем связанные назначения
    console.log('Deleting related assignments...')
    const assignmentsPath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(assignmentsPath, [])
    const updatedAssignments = assignments.filter(assignment => 
      assignment.courierId !== userId && assignment.passengerId !== userId
    )
    await this.writeJsonFile(assignmentsPath, updatedAssignments)
    console.log('Assignments updated, removed:', assignments.length - updatedAssignments.length)
    
    // Удаляем пользователя
    console.log('Deleting user...')
    users.splice(userIndex, 1)
    await this.writeJsonFile(filePath, users)
    console.log('User deleted successfully')
    return true
  }

  // === ФИЛИАЛЫ ===
  async getBranches() {
    const filePath = path.join(this.dataDir, 'branches.json')
    return await this.readJsonFile(filePath, [])
  }

  // === ДАННЫЕ ДНЯ ===
  async getDayData(date) {
    const filePath = path.join(this.dailyDir, `${date}.json`)
    const defaultData = { date, shifts: [], assignments: [] }
    return await this.readJsonFile(filePath, defaultData)
  }

  async saveDayData(date, data) {
    const filePath = path.join(this.dailyDir, `${date}.json`)
    await this.writeJsonFile(filePath, data)
  }

  // === СМЕНЫ ===
  async getTodayShifts(branchId = null) {
    const today = new Date().toISOString().split('T')[0]
    const filePath = path.join(this.dataDir, 'shifts.json')
    const allShifts = await this.readJsonFile(filePath, [])
    
    let shifts = allShifts.filter(shift => shift.date === today)
    if (branchId) {
      shifts = shifts.filter(shift => shift.branchId === branchId)
    }
    
    return shifts
  }

  async getAllShifts() {
    const filePath = path.join(this.dataDir, 'shifts.json')
    return await this.readJsonFile(filePath, [])
  }

  async addShift(shiftData) {
    const today = new Date().toISOString().split('T')[0]
    const filePath = path.join(this.dataDir, 'shifts.json')
    const shifts = await this.readJsonFile(filePath, [])
    
    // Проверяем, есть ли уже смена для этого пользователя сегодня
    const existingShift = shifts.find(shift => 
      shift.userId === shiftData.userId && shift.date === today
    )
    if (existingShift) {
      throw new Error('User already has a shift today')
    }
    
    const newShift = {
      id: `shift_${Date.now()}`,
      ...shiftData,
      date: today,
      createdAt: new Date().toISOString()
    }
    
    shifts.push(newShift)
    await this.writeJsonFile(filePath, shifts)
    
    // Синхронизируем данные пользователя при создании смены
    const userUpdates = {}
    if (shiftData.endTime) {
      userUpdates.workUntil = shiftData.endTime
    }
    if (shiftData.destinationAddress) {
      userUpdates.address = shiftData.destinationAddress
    }
    
    if (Object.keys(userUpdates).length > 0) {
      try {
        await this.updateUser(shiftData.userId, userUpdates)
        console.log(`Synchronized user ${shiftData.userId} data:`, userUpdates)
      } catch (error) {
        console.warn(`Failed to synchronize user data: ${error.message}`)
      }
    }
    
    return newShift
  }

  async updateShift(shiftId, updates) {
    const filePath = path.join(this.dataDir, 'shifts.json')
    const shifts = await this.readJsonFile(filePath, [])
    
    const shiftIndex = shifts.findIndex(shift => shift.id === shiftId)
    if (shiftIndex === -1) {
      throw new Error('Shift not found')
    }
    
    const oldShift = shifts[shiftIndex]
    shifts[shiftIndex] = { ...shifts[shiftIndex], ...updates }
    await this.writeJsonFile(filePath, shifts)
    
    // Синхронизируем данные пользователя если изменилось время окончания работы
    if (updates.endTime && updates.endTime !== oldShift.endTime) {
      try {
        await this.updateUser(oldShift.userId, { workUntil: updates.endTime })
        console.log(`Updated user ${oldShift.userId} workUntil to ${updates.endTime}`)
      } catch (error) {
        console.warn(`Failed to update user workUntil: ${error.message}`)
      }
    }
    
    // Синхронизируем адрес назначения если он изменился
    if (updates.destinationAddress && updates.destinationAddress !== oldShift.destinationAddress) {
      try {
        await this.updateUser(oldShift.userId, { address: updates.destinationAddress })
        console.log(`Updated user ${oldShift.userId} address to ${updates.destinationAddress}`)
      } catch (error) {
        console.warn(`Failed to update user address: ${error.message}`)
      }
    }
    
    return shifts[shiftIndex]
  }

  async deleteShift(shiftId) {
    const filePath = path.join(this.dataDir, 'shifts.json')
    const shifts = await this.readJsonFile(filePath, [])
    
    const shiftIndex = shifts.findIndex(shift => shift.id === shiftId)
    if (shiftIndex === -1) {
      throw new Error('Shift not found')
    }
    
    const deletedShift = shifts[shiftIndex]
    console.log('Found shift to delete:', deletedShift)
    
    // Получаем информацию о пользователе
    const user = await this.getUserById(deletedShift.userId)
    if (!user) {
      throw new Error('User not found for shift')
    }
    
    // Находим все назначения этого пользователя на сегодня
    const today = new Date().toISOString().split('T')[0]
    const assignmentsPath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(assignmentsPath, [])
    
    let affectedAssignments = []
    if (user.role === 'courier') {
      // Для курьера - находим все назначения где он курьер
      affectedAssignments = assignments.filter(assignment => 
        assignment.courierId === user.id && 
        assignment.date === today &&
        assignment.status !== 'completed' &&
        assignment.status !== 'cancelled'
      )
    } else if (user.role === 'passenger') {
      // Для пассажира - находим все назначения где он пассажир
      affectedAssignments = assignments.filter(assignment => 
        assignment.passengerId === user.id && 
        assignment.date === today &&
        assignment.status !== 'completed' &&
        assignment.status !== 'cancelled'
      )
    }
    
    console.log('Found affected assignments:', affectedAssignments.length)
    
    // Удаляем смену
    shifts.splice(shiftIndex, 1)
    await this.writeJsonFile(filePath, shifts)
    console.log('Shift deleted successfully')
    
    return {
      deletedShift,
      user,
      affectedAssignments
    }
  }

  // Проверить есть ли у пользователя смена сегодня
  async hasUserShiftToday(userId) {
    const today = new Date().toISOString().split('T')[0]
    const filePath = path.join(this.dataDir, 'shifts.json')
    const shifts = await this.readJsonFile(filePath, [])
    return shifts.some(shift => shift.userId === userId && shift.date === today)
  }

  // Сброс всех смен (вызывается в час ночи)
  async resetAllShifts() {
    console.log('Resetting all shifts at midnight...')
    const filePath = path.join(this.dataDir, 'shifts.json')
    
    try {
      // Очищаем файл смен
      await this.writeJsonFile(filePath, [])
      console.log('All shifts reset successfully')
      return true
    } catch (error) {
      console.error('Error resetting shifts:', error)
      throw error
    }
  }

  // === НАЗНАЧЕНИЯ ===
  async getTodayAssignments(branchId = null) {
    const today = new Date().toISOString().split('T')[0]
    const filePath = path.join(this.dataDir, 'assignments.json')
    const allAssignments = await this.readJsonFile(filePath, [])
    
    let assignments = allAssignments.filter(assignment => assignment.date === today)
    if (branchId) {
      assignments = assignments.filter(assignment => assignment.branchId === branchId)
    }
    
    return assignments
  }

  async getAllAssignments() {
    const filePath = path.join(this.dataDir, 'assignments.json')
    return await this.readJsonFile(filePath, [])
  }

  async getAssignmentById(assignmentId) {
    const filePath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(filePath, [])
    return assignments.find(assignment => assignment.id === assignmentId)
  }

  async addAssignment(assignmentData) {
    const today = new Date().toISOString().split('T')[0]
    const filePath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(filePath, [])
    
    const newAssignment = {
      id: `assign_${Date.now()}`,
      ...assignmentData,
      date: today,
      status: 'assigned',
      confirmedByCourier: false,
      confirmedByPassenger: false,
      createdAt: new Date().toISOString()
    }
    
    assignments.push(newAssignment)
    await this.writeJsonFile(filePath, assignments)
    return newAssignment
  }

  async updateAssignment(assignmentId, updates) {
    const filePath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(filePath, [])
    
    const assignmentIndex = assignments.findIndex(assignment => assignment.id === assignmentId)
    if (assignmentIndex === -1) {
      throw new Error('Assignment not found')
    }
    
    assignments[assignmentIndex] = { ...assignments[assignmentIndex], ...updates }
    await this.writeJsonFile(filePath, assignments)
    return assignments[assignmentIndex]
  }

  async deleteAssignment(assignmentId) {
    const filePath = path.join(this.dataDir, 'assignments.json')
    const assignments = await this.readJsonFile(filePath, [])
    
    const assignmentIndex = assignments.findIndex(assignment => assignment.id === assignmentId)
    if (assignmentIndex === -1) {
      throw new Error('Assignment not found')
    }
    
    assignments.splice(assignmentIndex, 1)
    await this.writeJsonFile(filePath, assignments)
    return true
  }

  // === ДОСТУПНЫЕ КУРЬЕРЫ И ПАССАЖИРЫ ===
  async getAvailableCouriers(date, branchId) {
    const filePath = path.join(this.dataDir, 'shifts.json')
    const assignmentsPath = path.join(this.dataDir, 'assignments.json')
    
    const shifts = await this.readJsonFile(filePath, [])
    const assignments = await this.readJsonFile(assignmentsPath, [])
    const users = await this.getUsers()
    
    // Курьеры в смене на указанную дату
    const workingCourierIds = shifts
      .filter(shift => shift.isWorking && shift.branchId === branchId && shift.date === date)
      .map(shift => shift.userId)
    
    // Занятые курьеры на указанную дату
    const assignedCourierIds = assignments
      .filter(assignment => assignment.branchId === branchId && assignment.date === date)
      .map(assignment => assignment.courierId)
    
    // Доступные курьеры (в смене, но не занятые или могут взять дополнительных пассажиров)
    return users.filter(user => 
      user.role === 'courier' && 
      user.branchId === branchId && 
      workingCourierIds.includes(user.id)
    )
  }

  async getAvailablePassengers(date, branchId) {
    const assignmentsPath = path.join(this.dataDir, 'assignments.json')
    const shiftsPath = path.join(this.dataDir, 'shifts.json')
    
    const assignments = await this.readJsonFile(assignmentsPath, [])
    const shifts = await this.readJsonFile(shiftsPath, [])
    const users = await this.getUsers()
    
    // Уже назначенные пассажиры на указанную дату (только активные назначения)
    const assignedPassengerIds = assignments
      .filter(assignment => 
        assignment.branchId === branchId && 
        assignment.date === date &&
        assignment.status !== 'cancelled' &&
        assignment.status !== 'completed'
      )
      .map(assignment => assignment.passengerId)
    
    // Пассажиры в смене на указанную дату
    const workingPassengerIds = shifts
      .filter(shift => shift.isWorking && shift.branchId === branchId && shift.date === date)
      .map(shift => shift.userId)
    
    // Доступные пассажиры (должны быть в смене, активны и не назначены)
    return users.filter(user => 
      user.role === 'passenger' && 
      user.branchId === branchId && 
      user.isActive &&
      workingPassengerIds.includes(user.id) &&
      !assignedPassengerIds.includes(user.id)
    )
  }

  // === СИНХРОНИЗАЦИЯ ДАННЫХ ===
  async syncUserDataWithShifts() {
    console.log('Starting user data synchronization with shifts...')
    const today = new Date().toISOString().split('T')[0]
    const shifts = await this.getTodayShifts()
    const users = await this.getUsers()
    
    let syncCount = 0
    
    for (const shift of shifts) {
      const user = users.find(u => u.id === shift.userId)
      if (!user) continue
      
      const updates = {}
      
      // Синхронизируем время окончания работы
      if (shift.endTime && user.workUntil !== shift.endTime) {
        updates.workUntil = shift.endTime
      }
      
      // Синхронизируем адрес назначения
      if (shift.destinationAddress && user.address !== shift.destinationAddress) {
        updates.address = shift.destinationAddress
      }
      
      if (Object.keys(updates).length > 0) {
        try {
          await this.updateUser(user.id, updates)
          console.log(`Synchronized user ${user.id} (${user.fullName}):`, updates)
          syncCount++
        } catch (error) {
          console.warn(`Failed to sync user ${user.id}: ${error.message}`)
        }
      }
    }
    
    console.log(`Synchronization completed. Updated ${syncCount} users.`)
    return syncCount
  }

  // === КОНФИГУРАЦИЯ ===
  async getConfig() {
    const filePath = path.join(this.dataDir, 'config.json')
    return await this.readJsonFile(filePath, {})
  }
}

module.exports = JsonDataService
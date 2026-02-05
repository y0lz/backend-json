const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const cron = require('node-cron')
require('dotenv').config()
const SupabaseDataSyncService = require('./services/SupabaseDataSyncService')
const TaxiTelegramBot = require('./bot/TelegramBot')

const app = express()
const dataService = SupabaseDataSyncService

// Инициализация Supabase
async function initializeSupabase() {
  console.log('🔄 Инициализация Supabase...')
  
  try {
    const isInitialized = await dataService.initialize()
    
    if (isInitialized) {
      console.log('✅ Supabase успешно подключен!')
      
      // Выводим статус подключения
      const status = dataService.getStorageInfo()
      console.log('📊 Статус Supabase:', {
        режим: status.primaryStorage,
        пользователи: status.supabaseReady ? '✅' : '❌',
        хранилище: status.storageReady ? '✅' : '❌',
        синхронизация: status.syncEnabled ? '✅' : '❌',
        гибридный: status.isHybrid ? '✅' : '❌'
      })
      
    } else {
      console.log('❌ Не удалось подключиться к Supabase')
      console.log('💡 Проверьте:')
      console.log('   - SUPABASE_URL в конфигурации')
      console.log('   - SUPABASE_SERVICE_ROLE_KEY')
      console.log('   - Интернет соединение')
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error.message)
  }
}
// Запускаем инициализацию Supabase
initializeSupabase()

// Загружаем конфигурацию для получения токена бота
let telegramBot = null
try {
  const configPath = path.join(__dirname, '../data/config.json')
  const configData = fs.readFileSync(configPath, 'utf8')
  const config = JSON.parse(configData)
  const botToken = config.telegram?.botToken
  
  if (botToken && botToken !== 'YOUR_BOT_TOKEN_HERE') {
    telegramBot = new TaxiTelegramBot(botToken)
    console.log('🤖 Telegram Bot initialized in server')
  } else {
    console.log('⚠️  Telegram Bot token not configured - notifications disabled')
  }
} catch (error) {
  console.log('⚠️  Could not load bot config - notifications disabled:', error.message)
}

// Планировщик для сброса смен в час ночи по МСК (UTC+3)
// Cron выражение: '0 1 * * *' - каждый день в 01:00 по МСК
cron.schedule('0 1 * * *', async () => {
  console.log('🕐 Midnight shift reset triggered (01:00 MSK)')
  try {
    await dataService.resetAllShifts()
    console.log('✅ All shifts reset successfully')
  } catch (error) {
    console.error('❌ Failed to reset shifts:', error)
  }
}, {
  timezone: "Europe/Moscow"
})

// Middleware
// CORS настройки
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app'
    : 'http://localhost:8847',
  credentials: true
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.static(path.join(__dirname, '../../client/dist')))

// Utility function to convert snake_case to camelCase
function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase)
  }
  
  if (obj !== null && typeof obj === 'object') {
    const converted = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
      converted[camelKey] = toCamelCase(value)
    }
    return converted
  }
  
  return obj
}

// Utility function to convert camelCase to snake_case
function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase)
  }
  
  if (obj !== null && typeof obj === 'object') {
    const converted = {}
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      converted[snakeKey] = toSnakeCase(value)
    }
    return converted
  }
  
  return obj
}

// Простая аутентификация (для демо)
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  const token = authHeader.substring(7)
  console.log('🔐 Authenticating with token:', token)
  
  if (token === 'simple-admin-token') {
    req.user = { role: 'admin', id: 'user_001' }
    console.log('✅ Admin authenticated')
    next()
  } else if (token.startsWith('user-token-')) {
    // Извлекаем ID пользователя из токена
    const userId = token.replace('user-token-', '')
    try {
      const user = await dataService.getUserById(userId)
      if (user) {
        req.user = user
        console.log('✅ User authenticated:', user.fullName)
        next()
      } else {
        console.log('❌ User not found for token:', token)
        res.status(401).json({ error: 'Invalid token - user not found' })
      }
    } catch (error) {
      console.log('❌ Error validating user token:', error.message)
      res.status(401).json({ error: 'Invalid token' })
    }
  } else {
    console.log('❌ Invalid token format:', token)
    res.status(401).json({ error: 'Invalid token' })
  }
}

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  const supabaseStatus = dataService.getStorageInfo()
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-supabase',
    supabase: {
      ready: supabaseStatus.supabaseReady,
      storage: supabaseStatus.storageReady,
      mode: supabaseStatus.primaryStorage,
      hybrid: supabaseStatus.isHybrid
    }
  })
})

// === SUPABASE STATUS ===
app.get('/api/supabase/status', authenticate, async (req, res) => {
  try {
    const status = dataService.getStorageInfo()
    
    res.json({
      ...status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Ошибка получения статуса Supabase:', error)
    res.status(500).json({ 
      error: 'Ошибка получения статуса Supabase',
      details: error.message 
    })
  }
})

// === SUPABASE TEST CONNECTION ===
app.post('/api/supabase/test', authenticate, async (req, res) => {
  try {
    console.log('🔍 Тестирование подключения к Supabase...')
    
    const startTime = Date.now()
    const stats = await dataService.getStats()
    const responseTime = Date.now() - startTime
    
    res.json({
      success: true,
      message: 'Подключение к Supabase работает',
      responseTime,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Ошибка тестирования Supabase:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// === QUEUE STATS ===
app.get('/api/queue/stats', authenticate, async (req, res) => {
  try {
    // Возвращаем базовую информацию о состоянии очереди
    res.json({
      size: 0,
      status: 'normal',
      processed: 0,
      failed: 0
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    res.status(500).json({ error: 'Failed to get queue stats' })
  }
})

// === STATS API ===
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const stats = await dataService.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === STORAGE API ===
app.get('/api/storage/stats', authenticate, async (req, res) => {
  try {
    if (!dataService.storageService.isReady()) {
      return res.status(503).json({ error: 'Supabase Storage service не готов' })
    }

    const storageInfo = dataService.storageService.getStorageInfo()
    res.json(storageInfo)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === OPENAPI SPECIFICATION ===
app.get('/api/openapi', async (req, res) => {
  try {
    const spec = await dataService.storageService.getOpenAPISpec()
    
    if (!spec || Object.keys(spec).length === 0) {
      return res.status(404).json({ error: 'OpenAPI specification not found' })
    }
    
    res.json(spec)
  } catch (error) {
    console.error('Ошибка получения OpenAPI спецификации:', error)
    res.status(500).json({ error: 'Failed to load OpenAPI specification' })
  }
})

// Endpoint для получения OpenAPI спецификации в формате JSON для скачивания
app.get('/api/openapi.json', async (req, res) => {
  try {
    const spec = await dataService.storageService.getOpenAPISpec()
    
    if (!spec || Object.keys(spec).length === 0) {
      return res.status(404).json({ error: 'OpenAPI specification not found' })
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"')
    res.json(spec)
  } catch (error) {
    console.error('Ошибка получения OpenAPI спецификации:', error)
    res.status(500).json({ error: 'Failed to load OpenAPI specification' })
  }
})

app.get('/api/storage/files/:userId', authenticate, async (req, res) => {
  try {
    if (!storageService.isReady()) {
      return res.status(503).json({ error: 'Storage service не готов' })
    }

    const { userId } = req.params
    const { limit = 10 } = req.query
    
    const files = await storageService.getUserFiles(userId, parseInt(limit))
    res.json(files)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/storage/file/:fileId/url', authenticate, async (req, res) => {
  try {
    if (!storageService.isReady()) {
      return res.status(503).json({ error: 'Storage service не готов' })
    }

    const { fileId } = req.params
    const url = await storageService.getFileUrl(fileId)
    
    if (!url) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    res.json({ url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/storage/file/:fileId', authenticate, async (req, res) => {
  try {
    if (!storageService.isReady()) {
      return res.status(503).json({ error: 'Storage service не готов' })
    }

    const { fileId } = req.params
    await storageService.deleteFile(fileId)
    
    res.json({ success: true, message: 'File deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Пример загрузки файла (требует multer middleware)
app.post('/api/storage/upload/avatar/:userId', authenticate, async (req, res) => {
  try {
    if (!storageService.isReady()) {
      return res.status(503).json({ error: 'Storage service не готов' })
    }

    // Здесь должен быть multer middleware для обработки файлов
    // Пример с base64 данными из body
    const { userId } = req.params
    const { fileData, fileName, mimeType } = req.body
    
    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing file data or name' })
    }
    
    // Декодируем base64
    const fileBuffer = Buffer.from(fileData, 'base64')
    
    const result = await storageService.uploadUserAvatar(userId, fileBuffer, fileName, mimeType)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Статические файлы для тестирования
app.use('/test', express.static('.'))

// === AUTHENTICATION ===
app.post('/api/auth/login', async (req, res) => {
  try {
    const { telegramId, hashKey } = req.body
    
    // Простая проверка админа
    if (telegramId === '123456789' && hashKey === 'simple-admin-key-2026') {
      return res.json({
        token: 'simple-admin-token',
        user: {
          id: 'user_001',
          telegramId: '123456789',
          role: 'admin',
          fullName: 'Администратор Системы'
        }
      })
    }
    
    // Проверка обычных пользователей
    const user = await dataService.getUserByTelegramId(telegramId)
    if (user) {
      return res.json({
        token: `user-token-${user.id}`,
        user: user
      })
    }
    
    res.status(401).json({ error: 'Invalid credentials' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/auth/me', authenticate, async (req, res) => {
  // Возвращаем полную информацию о пользователе для админа
  const user = {
    id: req.user.id,
    role: req.user.role,
    telegramId: '123456789',
    fullName: 'Администратор Системы'
  }
  res.json(user)
})

// === USERS ===
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const users = await dataService.getUsers()
    res.json(toCamelCase(users))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const user = await dataService.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(toCamelCase(user))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Получить пользователя по Telegram ID
app.get('/api/users/telegram/:telegramId', authenticate, async (req, res) => {
  try {
    const user = await dataService.getUserByTelegramId(req.params.telegramId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', authenticate, async (req, res) => {
  try {
    console.log('Creating user with data:', req.body)
    
    // Проверяем обязательные поля
    const { telegramId, role, fullName, phone, address, branchId } = req.body
    
    if (!telegramId || !role || !fullName || !phone || !address || !branchId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['telegramId', 'role', 'fullName', 'phone', 'address', 'branchId']
      })
    }

    // Проверяем что пользователь с таким telegramId не существует
    const existingUser = await dataService.getUserByTelegramId(telegramId)
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this Telegram ID already exists' 
      })
    }

    const user = await dataService.addUser(req.body)
    res.status(201).json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/users/:id', authenticate, async (req, res) => {
  try {
    const user = await dataService.updateUser(req.params.id, req.body)
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/users/:id', authenticate, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/users/:id called with id:', req.params.id)
    console.log('🔐 Authenticated user:', req.user)
    
    const userId = req.params.id;
    
    // В гибридном режиме сначала пытаемся найти пользователя
    let user = await dataService.getUserById(userId);
    
    if (!user) {
      // Если не найден по ID, пытаемся найти по telegramId
      user = await dataService.getUserByTelegramId(userId);
    }
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`🎯 Found user to delete: ${user.fullName} (${user.id})`);
    
    // Удаляем пользователя используя правильный ID
    const result = await dataService.deleteUser(user.id);
    console.log('✅ User deleted successfully, result:', result);
    
    res.json({ success: true, message: 'Пользователь удален' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
})

// === BRANCHES ===
app.get('/api/branches', authenticate, async (req, res) => {
  try {
    const branches = await dataService.getBranches()
    res.json(toCamelCase(branches))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === SHIFTS ===
app.get('/api/shifts', authenticate, async (req, res) => {
  try {
    const { branchId } = req.query
    const shifts = await dataService.getTodayShifts(branchId)
    res.json(shifts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/shifts/today', authenticate, async (req, res) => {
  try {
    const { branchId } = req.query
    const shifts = await dataService.getTodayShifts(branchId)
    res.json(toCamelCase(shifts))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/shifts', authenticate, async (req, res) => {
  try {
    const shift = await dataService.addShift(req.body)
    res.status(201).json(shift)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/shifts/:id', authenticate, async (req, res) => {
  try {
    const shift = await dataService.updateShift(req.params.id, req.body)
    res.json(shift)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/shifts/:id', authenticate, async (req, res) => {
  try {
    console.log('Deleting shift:', req.params.id)
    const result = await dataService.deleteShift(req.params.id)
    
    // Проверяем что result существует и имеет правильную структуру
    if (!result) {
      return res.status(404).json({ error: 'Смена не найдена' })
    }
    
    // Обрабатываем затронутые назначения
    const affectedAssignments = result.affectedAssignments || []
    if (affectedAssignments.length > 0) {
      console.log('Processing affected assignments:', affectedAssignments.length)
      
      for (const assignment of affectedAssignments) {
        if (result.user && result.user.role === 'courier') {
          // Курьер снят со смены - УДАЛЯЕМ назначение полностью
          console.log('Courier removed from shift - deleting assignment:', assignment.id)
          
          // Отправляем уведомления ПЕРЕД удалением
          if (telegramBot) {
            try {
              // Уведомляем пассажира об отмене поездки
              const passenger = await dataService.getUserById(assignment.passengerId)
              if (passenger) {
                await telegramBot.notifyUser(passenger.telegramId,
                  `❌ Ваша поездка отменена!\n\n` +
                  `🕐 Время: ${assignment.assignedTime}\n` +
                  `📍 Откуда: ${assignment.pickupAddress}\n` +
                  `🎯 Куда: ${assignment.dropoffAddress}\n\n` +
                  `Причина: Курьер снят со смены\n` +
                  `Обратитесь к администратору для нового назначения.`
                )
              }
              
              // Уведомляем снятого курьера
              if (result.user && result.user.telegramId) {
                await telegramBot.notifyUser(result.user.telegramId,
                  `⚠️ Вы сняты со смены!\n\n` +
                  `Все ваши назначения удалены.\n` +
                  `Для возобновления работы обратитесь к администратору.`
                )
              }
            } catch (error) {
              console.error('Failed to send deletion notifications:', error)
            }
          }
          
          // УДАЛЯЕМ назначение полностью
          await dataService.deleteAssignment(assignment.id)
          
        } else if (result.user && result.user.role === 'passenger') {
          // Пассажир снят со смены - УДАЛЯЕМ назначение полностью
          console.log('Passenger removed from shift - deleting assignment:', assignment.id)
          
          // Отправляем уведомления ПЕРЕД удалением
          if (telegramBot) {
            try {
              // Уведомляем курьера об отмене поездки
              const courier = await dataService.getUserById(assignment.courierId)
              if (courier) {
                await telegramBot.notifyUser(courier.telegramId,
                  `❌ Поездка отменена!\n\n` +
                  `🕐 Время: ${assignment.assignedTime}\n` +
                  `📍 Откуда: ${assignment.pickupAddress}\n` +
                  `🎯 Куда: ${assignment.dropoffAddress}\n\n` +
                  `Причина: Пассажир снят со смены\n` +
                  `Ожидайте новых назначений.`
                )
              }
              
              // Уведомляем снятого пассажира
              if (result.user && result.user.telegramId) {
                await telegramBot.notifyUser(result.user.telegramId,
                  `⚠️ Вы сняты со смены!\n\n` +
                  `Все ваши назначения удалены.\n` +
                  `Для возобновления работы обратитесь к администратору.`
                )
              }
            } catch (error) {
              console.error('Failed to send deletion notifications:', error)
            }
          }
          
          // УДАЛЯЕМ назначение полностью
          await dataService.deleteAssignment(assignment.id)
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Смена удалена, все связанные маршруты удалены',
      affectedAssignments: result.affectedAssignments.length
    })
  } catch (error) {
    console.error('Error deleting shift:', error)
    res.status(500).json({ error: error.message })
  }
})

// Добавить пользователя в смену
app.post('/api/shifts/add-user', authenticate, async (req, res) => {
  try {
    const { userId } = req.body
    
    // В гибридном режиме сначала пытаемся найти по ID, потом по telegramId
    let user = await dataService.getUserById(userId)
    
    if (!user) {
      // Если не найден по ID, пытаемся найти по telegramId (для совместимости)
      user = await dataService.getUserByTelegramId(userId)
    }
    
    if (!user) {
      console.error(`User not found: ${userId}`)
      return res.status(404).json({ error: 'User not found' })
    }

    console.log(`Adding user to shift: ${user.fullName} (${user.id})`)

    // Проверяем, есть ли уже смена у пользователя (используем правильный ID)
    const hasShift = await dataService.hasUserShiftToday(user.id)
    if (hasShift) {
      return res.status(400).json({ error: 'User already has a shift today' })
    }

    const shiftData = {
      userId: user.id,
      telegramId: user.telegramId,
      branchId: user.branchId,
      startTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      endTime: '20:00',
      isWorking: true
    }
    
    const shift = await dataService.addShift(shiftData)
    res.status(201).json(shift)
  } catch (error) {
    console.error('Error adding user to shift:', error)
    res.status(500).json({ error: error.message })
  }
})

// Проверить есть ли у пользователя смена
app.get('/api/shifts/user/:userId/has-shift', authenticate, async (req, res) => {
  try {
    const { userId } = req.params
    const hasShift = await dataService.hasUserShiftToday(userId)
    res.json({ hasShift })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Синхронизировать данные пользователей со сменами
app.post('/api/shifts/sync-users', authenticate, async (req, res) => {
  try {
    const syncCount = await dataService.syncUserDataWithShifts()
    res.json({ 
      success: true, 
      message: `Синхронизировано ${syncCount} пользователей`,
      syncCount 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === ASSIGNMENTS ===
app.get('/api/assignments/today', authenticate, async (req, res) => {
  try {
    const { branchId } = req.query
    const assignments = await dataService.getTodayAssignments(branchId)
    res.json(toCamelCase(assignments))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/assignments', authenticate, async (req, res) => {
  try {
    console.log('Creating assignment:', req.body)
    const assignment = await dataService.addAssignment(req.body)
    console.log('Assignment created:', assignment.id)
    
    // Отправляем уведомления через Telegram бот
    if (telegramBot) {
      try {
        console.log('Sending Telegram notifications for assignment:', assignment.id)
        await telegramBot.notifyAssignment(assignment)
        console.log('Telegram notifications sent successfully')
      } catch (error) {
        console.error('Failed to send Telegram notifications:', error)
      }
    } else {
      console.log('Telegram bot not available - skipping notifications')
    }
    
    res.status(201).json(assignment)
  } catch (error) {
    console.error('Error creating assignment:', error)
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/assignments/:id', authenticate, async (req, res) => {
  try {
    const oldAssignment = await dataService.getAssignmentById(req.params.id)
    const assignment = await dataService.updateAssignment(req.params.id, req.body)
    
    // Если статус изменился на cancelled, отправляем уведомления
    if (oldAssignment && oldAssignment.status !== 'cancelled' && assignment.status === 'cancelled') {
      console.log('Assignment cancelled, sending notifications:', assignment.id)
      if (telegramBot) {
        await telegramBot.notifyAssignmentCancellation(assignment)
      }
    }
    
    res.json(assignment)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/assignments/:id', authenticate, async (req, res) => {
  try {
    // Получаем данные назначения перед удалением для отправки уведомлений
    const assignment = await dataService.getAssignmentById(req.params.id)
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }
    
    // Удаляем назначение
    await dataService.deleteAssignment(req.params.id)
    
    // Отправляем уведомления об отмене, если назначение было активным
    if (assignment.status === 'assigned' && telegramBot) {
      console.log('Assignment deleted, sending cancellation notifications:', assignment.id)
      await telegramBot.notifyAssignmentCancellation(assignment)
    }
    
    res.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === AVAILABLE RESOURCES ===
app.get('/api/assignments/couriers/available', authenticate, async (req, res) => {
  try {
    const { date, branchId } = req.query
    const couriers = await dataService.getAvailableCouriers(date, branchId)
    res.json(toCamelCase(couriers))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/assignments/passengers/available', authenticate, async (req, res) => {
  try {
    const { date, branchId } = req.query
    const passengers = await dataService.getAvailablePassengers(date, branchId)
    res.json(toCamelCase(passengers))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === DEBUG ENDPOINTS ===
app.get('/api/debug/data', authenticate, async (req, res) => {
  try {
    const data = {
      users: await dataService.getUsers(),
      branches: await dataService.getBranches(),
      shifts: await dataService.getAllShifts(),
      assignments: await dataService.getAllAssignments(),
      config: await dataService.getConfig()
    }
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === LOWDB SPECIFIC ENDPOINTS ===
app.get('/api/lowdb/stats', authenticate, async (req, res) => {
  try {
    if (!dataService.isReady()) {
      return res.status(503).json({ error: 'Data service не готов' })
    }

    const stats = await dataService.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/lowdb/backup', authenticate, async (req, res) => {
  try {
    if (!dataService.lowDBService.isReady()) {
      return res.status(503).json({ error: 'LowDB service не готов' })
    }

    const backupPath = await dataService.lowDBService.backup()
    res.json({ 
      success: true, 
      message: 'Backup создан успешно',
      backupPath: backupPath
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === DATA SYNC ENDPOINTS ===
app.get('/api/sync/info', authenticate, async (req, res) => {
  try {
    const info = dataService.getStorageInfo()
    const stats = await dataService.getStats()
    
    res.json({
      ...info,
      stats: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sync/switch-storage', authenticate, async (req, res) => {
  try {
    const { storage } = req.body
    
    if (!storage || (storage !== 'lowdb' && storage !== 'nhost')) {
      return res.status(400).json({ error: 'Storage должен быть "lowdb" или "nhost"' })
    }
    
    await dataService.switchPrimaryStorage(storage)
    
    res.json({ 
      success: true, 
      message: `Основное хранилище переключено на: ${storage}`,
      storageInfo: dataService.getStorageInfo()
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sync/full-sync', authenticate, async (req, res) => {
  try {
    const result = await dataService.fullSync()
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Полная синхронизация завершена успешно'
      })
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sync/migrate-to-nhost', authenticate, async (req, res) => {
  try {
    if (!dataService.nhostService.isReady()) {
      return res.status(503).json({ error: 'Nhost service не готов' })
    }
    
    const result = await dataService.nhostService.migrateFromLowDB(dataService.lowDBService)
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Миграция завершена. Мигрировано ${result.migratedUsers} из ${result.totalUsers} пользователей`,
        migratedUsers: result.migratedUsers,
        totalUsers: result.totalUsers
      })
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// === USER AVATAR ENDPOINTS ===
app.post('/api/users/:userId/avatar', authenticate, async (req, res) => {
  try {
    const { userId } = req.params
    const { fileData, fileName, mimeType } = req.body
    
    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing file data or name' })
    }
    
    // Декодируем base64
    const fileBuffer = Buffer.from(fileData, 'base64')
    
    const result = await dataService.uploadUserAvatar(userId, fileBuffer, fileName, mimeType)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/users/:userId/avatar', authenticate, async (req, res) => {
  try {
    const { userId } = req.params
    const avatarUrl = await dataService.getUserAvatarUrl(userId)
    
    if (avatarUrl) {
      res.json({ url: avatarUrl })
    } else {
      res.status(404).json({ error: 'Avatar not found' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Debug endpoint без аутентификации для быстрой проверки
app.get('/api/debug/assignments', async (req, res) => {
  try {
    const assignments = await dataService.getTodayAssignments()
    res.json({
      count: assignments.length,
      assignments: assignments.map(a => ({
        id: a.id,
        status: a.status,
        date: a.date,
        courierId: a.courierId,
        passengerId: a.passengerId
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})

// Export app for Vercel serverless deployment
module.exports = app

// Start server only in development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8848
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JSON Taxi Management Server running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
    console.log(`🔧 Debug data: http://localhost:${PORT}/api/debug/data`)
  })
}
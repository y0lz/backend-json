// Vercel serverless function entry point
const app = require('../src/server')

// Инициализируем сервисы при первом запуске
let isInitialized = false

async function initializeServices() {
  if (isInitialized) return
  
  try {
    console.log('🔄 Инициализация сервисов для Vercel...')
    // Инициализация происходит в server.js
    isInitialized = true
    console.log('✅ Сервисы инициализированы для Vercel')
  } catch (error) {
    console.error('❌ Ошибка инициализации сервисов:', error.message)
  }
}

module.exports = async (req, res) => {
  await initializeServices()
  return app(req, res)
}
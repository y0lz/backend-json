// Endpoint для установки Telegram webhook
const TelegramBot = require('node-telegram-bot-api')

const token = process.env.TELEGRAM_BOT_TOKEN

module.exports = async (req, res) => {
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' })
  }
  
  try {
    const bot = new TelegramBot(token)
    
    // URL webhook должен быть HTTPS
    const webhookUrl = `https://${req.headers.host}/api/webhook`
    
    console.log('🔗 Устанавливаем webhook:', webhookUrl)
    
    // Устанавливаем webhook
    const result = await bot.setWebHook(webhookUrl)
    
    if (result) {
      console.log('✅ Webhook установлен успешно')
      
      // Получаем информацию о webhook
      const webhookInfo = await bot.getWebHookInfo()
      
      res.status(200).json({
        success: true,
        message: 'Webhook установлен успешно',
        webhookUrl: webhookUrl,
        webhookInfo: webhookInfo
      })
    } else {
      res.status(500).json({ error: 'Не удалось установить webhook' })
    }
    
  } catch (error) {
    console.error('❌ Ошибка установки webhook:', error.message)
    res.status(500).json({ 
      error: 'Ошибка установки webhook',
      details: error.message 
    })
  }
}
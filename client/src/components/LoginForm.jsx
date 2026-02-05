import React, { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
  Divider
} from '@mui/material'
import { 
  Visibility, 
  VisibilityOff, 
  Login,
  Telegram,
  Key
} from '@mui/icons-material'

function LoginForm({ onLogin }) {
  const [telegramId, setTelegramId] = useState('')
  const [hashKey, setHashKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!telegramId || !hashKey) return

    setLoading(true)
    try {
      await onLogin(telegramId, hashKey)
    } finally {
      setLoading(false)
    }
  }

  const fillTestData = () => {
    setTelegramId('123456789')
    setHashKey('simple-admin-key-2026')
  }

  return (
    <Box sx={{ maxWidth: 450, mx: 'auto' }}>
      <Fade in timeout={600}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)'
            }}>
              <Login sx={{ fontSize: '2rem', color: 'white' }} />
            </Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
              Добро пожаловать
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Войдите в систему для продолжения работы
            </Typography>
          </Box>

          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              '& .MuiAlert-icon': {
                color: '#2563eb'
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Тестовые данные для входа:
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Telegram ID:</strong> 123456789<br />
              <strong>Ключ доступа:</strong> simple-admin-key-2026
            </Typography>
          </Alert>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Telegram ID"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              margin="normal"
              required
              placeholder="Введите ваш Telegram ID"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Telegram color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Ключ доступа"
              type={showPassword ? 'text' : 'password'}
              value={hashKey}
              onChange={(e) => setHashKey(e.target.value)}
              margin="normal"
              required
              placeholder="Введите ключ доступа"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Key color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || !telegramId || !hashKey}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                mb: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#94a3b8'
                }
              }}
            >
              {loading ? 'Вход в систему...' : 'Войти в систему'}
            </Button>
            
            <Divider sx={{ my: 2 }}>или</Divider>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={fillTestData}
              disabled={loading}
              sx={{ 
                py: 1.5,
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&:hover': {
                  borderColor: '#2563eb',
                  background: 'rgba(37, 99, 235, 0.04)'
                }
              }}
            >
              Заполнить тестовыми данными
            </Button>
          </form>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mt: 3, 
              textAlign: 'center',
              fontSize: '0.875rem'
            }}
          >
            Для получения доступа обратитесь к администратору системы
          </Typography>
        </Paper>
      </Fade>
    </Box>
  )
}

export default LoginForm
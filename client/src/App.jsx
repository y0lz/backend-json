import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Fade,
  useTheme
} from '@mui/material'
import LoginForm from './components/LoginForm'
import Dashboard from './components/Dashboard'
import api from './services/api'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const theme = useTheme()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        api.setToken(token)
        // Проверяем токен через API
        try {
          const userData = await api.getMe()
          setUser(userData)
        } catch (error) {
          console.error('Token validation failed:', error)
          localStorage.removeItem('token')
          api.setToken(null)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      api.setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (telegramId, hashKey) => {
    try {
      setError('')
      setLoading(true)
      
      const response = await api.login(telegramId, hashKey)
      setUser(response.user)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.setToken(null)
    setUser(null)
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ 
        mt: 8, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
          Загрузка системы...
        </Typography>
      </Container>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: user ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      py: user ? 2 : 0
    }}>
      <Container maxWidth="xl" sx={{ pt: user ? 2 : 8 }}>
        <Fade in timeout={800}>
          <Paper 
            elevation={user ? 1 : 3} 
            sx={{ 
              p: user ? 3 : 4,
              background: user ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              border: user ? 'none' : '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {!user && (
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <Box sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                    fontSize: '2rem'
                  }}>
                    🚕
                  </Box>
                  <Typography 
                    variant="h4" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Система управления такси
                  </Typography>
                </Box>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '1.1rem',
                    fontWeight: 400
                  }}
                >
                  Современная платформа для управления автопарком и маршрутами
                </Typography>
              </Box>
            )}

            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.5rem'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {!user ? (
              <LoginForm onLogin={handleLogin} />
            ) : (
              <Dashboard user={user} onLogout={handleLogout} />
            )}
          </Paper>
        </Fade>
      </Container>
    </Box>
  )
}

export default App
import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  Avatar,
  Fade,
  LinearProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Divider
} from '@mui/material'
import {
  People,
  DirectionsCar,
  Assignment,
  ExitToApp,
  Sync,
  AutorenewRounded,
  TrendingUp,
  Schedule,
  CheckCircle,
  Storage,
  Close
} from '@mui/icons-material'
import UsersView from './UsersView'
import ShiftsView from './ShiftsView'
import AssignmentsView from './AssignmentsView'
import DatabaseInfo from './DatabaseInfo'
import api from '../services/api'

function Dashboard({ user, onLogout }) {
  const [currentTab, setCurrentTab] = useState(0)
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayShifts: 0,
    todayAssignments: 0,
    availableCouriers: 0
  })
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [nextUpdate, setNextUpdate] = useState(null)
  const [dbDialogOpen, setDbDialogOpen] = useState(false)
  const [storageInfo, setStorageInfo] = useState(null)
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    loadStats()
    loadStorageInfo()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const startAutoRefresh = () => {
        setNextUpdate(new Date(Date.now() + 30000))
        
        intervalRef.current = setInterval(() => {
          console.log('🔄 Auto-refresh triggered from Dashboard')
          loadStats()
          loadStorageInfo()
          // Уведомляем дочерние компоненты об обновлении
          window.dispatchEvent(new CustomEvent('autoRefresh'))
          console.log('📡 autoRefresh event dispatched')
          setNextUpdate(new Date(Date.now() + 30000))
        }, 30000) // 30 секунд
        
        // Обратный отсчет
        countdownRef.current = setInterval(() => {
          setNextUpdate(prev => {
            if (prev && prev > new Date()) {
              return prev
            }
            return new Date(Date.now() + 30000)
          })
        }, 1000)
      }
      
      startAutoRefresh()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setNextUpdate(null)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [autoRefresh])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [users, shifts, assignments] = await Promise.all([
        api.getUsers(),
        api.getTodayShifts(),
        api.getTodayAssignments()
      ])

      // Фильтруем только активные назначения (исключаем отмененные и завершенные)
      const activeAssignments = assignments.filter(assignment => 
        assignment.status !== 'cancelled' && assignment.status !== 'completed'
      )

      setStats({
        totalUsers: users.length,
        todayShifts: shifts.length,
        todayAssignments: activeAssignments.length, // Используем отфильтрованные назначения
        availableCouriers: shifts.filter(s => s.isWorking && users.find(u => u.id === s.userId && u.role === 'courier')).length
      })
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStorageInfo = async () => {
    try {
      const data = await api.getStorageInfo()
      setStorageInfo(data)
    } catch (error) {
      console.error('Failed to load storage info:', error)
    }
  }

  const handleAutoRefreshToggle = (event) => {
    setAutoRefresh(event.target.checked)
  }

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const getCountdown = () => {
    if (!nextUpdate || !autoRefresh) return null
    const diff = Math.max(0, Math.ceil((nextUpdate - new Date()) / 1000))
    return diff
  }

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue)
  }

  const getStorageStatusColor = () => {
    if (!storageInfo) return '#9ca3af'
    if (storageInfo.isHybrid) return '#10b981' // Зеленый для гибридного режима
    if (storageInfo.primaryStorage === 'supabase' && storageInfo.supabaseReady) return '#3b82f6'
    if (storageInfo.primaryStorage === 'lowdb' && storageInfo.lowdbReady) return '#f59e0b'
    return '#ef4444' // Красный для ошибок
  }

  const getStorageStatusText = () => {
    if (!storageInfo) return 'Загрузка...'
    if (storageInfo.isHybrid) return 'Гибридный режим (Supabase)'
    if (storageInfo.primaryStorage === 'supabase') return 'Supabase PostgreSQL'
    if (storageInfo.primaryStorage === 'lowdb') return 'JSON файлы'
    return 'Неизвестно'
  }

  const tabs = [
    { label: 'Пользователи', icon: <People />, component: <UsersView /> },
    { label: 'Смены', icon: <DirectionsCar />, component: <ShiftsView /> },
    { label: 'Маршруты', icon: <Assignment />, component: <AssignmentsView /> }
  ]

  const StatCard = ({ title, value, icon, color, trend, subtitle }) => (
    <Fade in timeout={600}>
      <Card sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
        border: `1px solid ${color}20`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                {title}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ 
              bgcolor: color, 
              width: 56, 
              height: 56,
              boxShadow: `0 8px 16px ${color}40`
            }}>
              {icon}
            </Avatar>
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                {trend}
              </Typography>
            </Box>
          )}
        </CardContent>
        {loading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0,
              '& .MuiLinearProgress-bar': {
                backgroundColor: color
              }
            }} 
          />
        )}
      </Card>
    </Fade>
  )

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Добро пожаловать, {user.fullName}! 👋
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={user.role === 'admin' ? 'Администратор' : user.role} 
              color="primary" 
              sx={{ fontWeight: 600 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Обновлено: {formatLastUpdate()}
              </Typography>
            </Box>
            {autoRefresh && (
              <Chip 
                icon={<AutorenewRounded />}
                label={`Обновление через ${getCountdown()}с`}
                color="success"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Tooltip title="Синхронизировать данные с сервером">
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={handleAutoRefreshToggle}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AutorenewRounded fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Автообновление
                  </Typography>
                </Box>
              }
            />
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={() => {
              loadStats()
              loadStorageInfo()
            }}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Синхронизировать
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ExitToApp />}
            onClick={onLogout}
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Выйти
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Всего сотрудников"
            value={stats.totalUsers}
            icon={<People />}
            color="#2563eb"
            subtitle="Зарегистрированных пользователей"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Сотрудников в смене"
            value={stats.todayShifts}
            icon={<DirectionsCar />}
            color="#10b981"
            subtitle="Активных смен сегодня"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Активных маршрутов"
            value={stats.todayAssignments}
            icon={<Assignment />}
            color="#f59e0b"
            subtitle="Запланированных поездок сегодня"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Курьеров в работе"
            value={stats.availableCouriers}
            icon={<CheckCircle />}
            color="#8b5cf6"
            subtitle="Доступных для заказов"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Fade in timeout={800}>
        <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 600
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab 
                key={index}
                label={tab.label} 
                icon={tab.icon}
                iconPosition="start"
                sx={{ 
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabs[currentTab]?.component}
          </Box>
        </Paper>
      </Fade>

      {/* Database Info FAB - правый нижний угол */}
      <Fab
        color="primary"
        onClick={() => setDbDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          background: `linear-gradient(135deg, ${getStorageStatusColor()} 0%, ${getStorageStatusColor()}CC 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${getStorageStatusColor()}DD 0%, ${getStorageStatusColor()}AA 100%)`,
          }
        }}
      >
        <Storage />
      </Fab>

      {/* Database Info Dialog */}
      <Dialog 
        open={dbDialogOpen} 
        onClose={() => setDbDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storage color="primary" />
            <Typography variant="h6" component="div">
              База данных - marakasi-01 (Supabase)
            </Typography>
          </Box>
          <IconButton onClick={() => setDbDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <Divider />
        
        <DialogContent sx={{ p: 3 }}>
          <DatabaseInfo />
          
          {/* Build Info */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            background: 'rgba(255,255,255,0.7)', 
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.1)'
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Информация о сборке
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Билд:</strong> marakasi-01
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Версия:</strong> 2.0.0-hybrid
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Режим:</strong> {getStorageStatusText()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Статус:</strong> 
                  <Chip 
                    size="small" 
                    label="Активен" 
                    color="success" 
                    sx={{ ml: 1, height: 20 }}
                  />
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default Dashboard
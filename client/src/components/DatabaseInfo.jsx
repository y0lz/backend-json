import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider
} from '@mui/material'
import {
  Storage,
  CloudSync,
  DataObject,
  Sync,
  Info,
  CheckCircle,
  Warning
} from '@mui/icons-material'
import api from '../services/api'

function DatabaseInfo() {
  const [storageInfo, setStorageInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    loadStorageInfo()
  }, [])

  const loadStorageInfo = async () => {
    try {
      setLoading(true)
      const data = await api.getStorageInfo()
      setStorageInfo(data)
    } catch (error) {
      setError('Не удалось загрузить информацию о хранилище')
    } finally {
      setLoading(false)
    }
  }

  const switchStorage = async (newStorage) => {
    try {
      setSwitching(true)
      await api.switchStorage(newStorage)
      await loadStorageInfo()
      setDialogOpen(false)
    } catch (error) {
      setError(error.message || 'Ошибка переключения хранилища')
    } finally {
      setSwitching(false)
    }
  }

  const fullSync = async () => {
    try {
      setSwitching(true)
      await api.fullSync()
      await loadStorageInfo()
      setError('✅ Синхронизация завершена успешно')
      setTimeout(() => setError(''), 3000)
    } catch (error) {
      setError(error.message || 'Ошибка синхронизации')
    } finally {
      setSwitching(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Загрузка информации о базе данных...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (error && !storageInfo) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    )
  }

  const getStorageIcon = (storage) => {
    switch (storage) {
      case 'lowdb':
        return <DataObject />
      case 'supabase':
      case 'hybrid':
        return <Storage />
      default:
        return <Info />
    }
  }

  const getStorageColor = (storage) => {
    switch (storage) {
      case 'lowdb':
        return 'primary'
      case 'supabase':
      case 'hybrid':
        return 'success'
      default:
        return 'default'
    }
  }

  const getStorageName = (storage) => {
    switch (storage) {
      case 'lowdb':
        return 'LowDB (JSON файлы)'
      case 'supabase':
        return 'Supabase (PostgreSQL + Storage)'
      case 'hybrid':
        return 'Гибридный режим (Supabase)'
      default:
        return 'Неизвестно'
    }
  }

  return (
    <Box>
      {error && (
        <Alert 
          severity={error.includes('✅') ? 'success' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Storage sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h3">
              Информация о базе данных
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Режим хранения
                </Typography>
                <Chip
                  icon={getStorageIcon(storageInfo?.primaryStorage)}
                  label={storageInfo?.isHybrid ? 'Гибридный режим' : getStorageName(storageInfo?.primaryStorage)}
                  color={storageInfo?.isHybrid ? 'secondary' : getStorageColor(storageInfo?.primaryStorage)}
                  size="medium"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Синхронизация
                </Typography>
                <Chip
                  icon={storageInfo?.syncEnabled ? <CheckCircle /> : <Warning />}
                  label={storageInfo?.syncEnabled ? 'Включена' : 'Отключена'}
                  color={storageInfo?.syncEnabled ? 'success' : 'warning'}
                  size="medium"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Статус компонентов
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {storageInfo?.isHybrid ? (
                    <>
                      <Chip
                        icon={<Storage />}
                        label={`PostgreSQL ${storageInfo?.supabaseReady ? '✅' : '❌'}`}
                        color={storageInfo?.supabaseReady ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        icon={<CloudSync />}
                        label={`Supabase Storage ${storageInfo?.storageReady ? '✅' : '❌'}`}
                        color={storageInfo?.storageReady ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                    </>
                  ) : (
                    <>
                      <Chip
                        icon={<DataObject />}
                        label={`LowDB ${storageInfo?.lowdbReady ? '✅' : '❌'}`}
                        color={storageInfo?.lowdbReady ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        icon={<Storage />}
                        label={`Supabase ${storageInfo?.supabaseReady ? '✅' : '❌'}`}
                        color={storageInfo?.supabaseReady ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                    </>
                  )}
                </Box>
              </Box>

              {storageInfo?.isHybrid && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Распределение данных
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label="👥 Пользователи → PostgreSQL"
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label="📁 JSON → Supabase Storage"
                      color="secondary"
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>

          {storageInfo?.stats && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" gutterBottom>
                Статистика данных
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="primary.main">
                    {storageInfo.stats.users?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Пользователей
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="success.main">
                    {storageInfo.stats.users?.couriers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Курьеров
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="info.main">
                    {storageInfo.stats.users?.passengers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Пассажиров
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="warning.main">
                    {storageInfo.stats.branches || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Филиалов
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={loadStorageInfo}
              disabled={switching}
            >
              Обновить
            </Button>
            
            {storageInfo?.syncEnabled && (
              <Button
                variant="outlined"
                startIcon={<CloudSync />}
                onClick={fullSync}
                disabled={switching}
              >
                Синхронизировать
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<Storage />}
              onClick={() => setDialogOpen(true)}
              disabled={switching}
            >
              Переключить хранилище
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Dialog для переключения хранилища */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Переключение хранилища данных</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Выберите основное хранилище для данных системы:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  border: storageInfo?.primaryStorage === 'lowdb' ? 2 : 1,
                  borderColor: storageInfo?.primaryStorage === 'lowdb' ? 'primary.main' : 'divider'
                }}
                onClick={() => switchStorage('lowdb')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <DataObject sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">LowDB</Typography>
                  <Typography variant="body2" color="text.secondary">
                    JSON файлы, быстрый старт
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Card 
                variant="outlined" 
                sx={{ 
                  cursor: 'pointer',
                  border: storageInfo?.primaryStorage === 'nhost' ? 2 : 1,
                  borderColor: storageInfo?.primaryStorage === 'nhost' ? 'success.main' : 'divider'
                }}
                onClick={() => switchStorage('nhost')}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Storage sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6">Nhost</Typography>
                  <Typography variant="body2" color="text.secondary">
                    PostgreSQL, масштабируемость
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Отмена
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DatabaseInfo
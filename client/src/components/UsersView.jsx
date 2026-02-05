import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material'
import { Add, EditNote, DeleteForever, PersonAdd } from '@mui/icons-material'
import api from '../services/api'

function UsersView() {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [userShifts, setUserShifts] = useState({}) // Состояние смен пользователей
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleteDialogState, setDeleteDialogState] = useState({ open: false, user: null })
  const [queueStats, setQueueStats] = useState({ size: 0, status: 'normal' })
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    telegramId: '',
    role: 'passenger',
    fullName: '',
    phone: '',
    address: '',
    position: '',
    workUntil: '',
    branchId: '',
    carModel: '',
    carNumber: ''
  })

  useEffect(() => {
    console.log('🔧 UsersView: Setting up auto-refresh listener')
    loadData()
    
    // Слушаем событие автообновления
    const handleAutoRefresh = () => {
      console.log('📥 UsersView: Received autoRefresh event')
      loadData()
    }
    
    window.addEventListener('autoRefresh', handleAutoRefresh)
    
    return () => {
      console.log('🧹 UsersView: Cleaning up auto-refresh listener')
      window.removeEventListener('autoRefresh', handleAutoRefresh)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, branchesData, queueData] = await Promise.all([
        api.getUsers(),
        api.getBranches(),
        api.getQueueStats().catch(() => ({ size: 0, status: 'normal' })) // Fallback если очередь недоступна
      ])
      setUsers(usersData)
      setBranches(branchesData)
      setQueueStats(queueData)
      
      // Проверяем смены для каждого пользователя
      const shiftChecks = {}
      for (const user of usersData) {
        if (user.role === 'courier' || user.role === 'passenger') {
          try {
            const result = await api.checkUserHasShift(user.id)
            shiftChecks[user.id] = result.hasShift
          } catch (error) {
            shiftChecks[user.id] = false
          }
        }
      }
      setUserShifts(shiftChecks)
    } catch (error) {
      setError('Ошибка загрузки данных: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        telegramId: user.telegramId,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
        position: user.position || '',
        workUntil: user.workUntil || '',
        branchId: user.branchId,
        carModel: user.carModel || '',
        carNumber: user.carNumber || ''
      })
    } else {
      setEditingUser(null)
      setFormData({
        telegramId: '',
        role: 'passenger',
        fullName: '',
        phone: '',
        address: '',
        position: '',
        workUntil: '',
        branchId: branches[0]?.id || '',
        carModel: '',
        carNumber: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
    setError('')
  }

  const handleSave = async () => {
    try {
      setError('')
      setIsCreating(true)
      
      // Преобразуем данные формы в формат backend
      const userData = {
        telegramId: formData.telegramId,
        role: formData.role,
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        workUntil: formData.workUntil,
        branchId: formData.branchId,
        isActive: true,
        ...(formData.role === 'passenger' && {
          position: formData.position
        }),
        ...(formData.role === 'courier' && {
          carModel: formData.carModel,
          carNumber: formData.carNumber
        })
      }
      
      if (editingUser) {
        await api.updateUser(editingUser.id, userData)
      } else {
        // Для создания пользователя показываем информацию об очереди
        if (queueStats.size > 3) {
          setError(`⏳ В очереди ${queueStats.size} операций. Ожидайте...`)
        }
        await api.createUser(userData)
      }
      
      await loadData()
      handleCloseDialog()
    } catch (error) {
      setError('Ошибка сохранения: ' + error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddToShift = async (user) => {
    try {
      setError('')
      await api.addUserToShift(user.id)
      
      // Обновляем состояние смены для этого пользователя
      setUserShifts(prev => ({ ...prev, [user.id]: true }))
      
      // Показываем успешное сообщение
      setError(`✅ ${user.fullName || 'Пользователь'} добавлен в смену`)
      setTimeout(() => setError(''), 3000)
    } catch (error) {
      setError('Ошибка добавления в смену: ' + error.message)
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: 'error',
      courier: 'primary',
      passenger: 'success'
    }
    return colors[role] || 'default'
  }

  const getRoleText = (role) => {
    const texts = {
      admin: 'Администратор',
      courier: 'Курьер',
      passenger: 'Пассажир'
    }
    return texts[role] || role
  }

  const handleDeleteUser = useCallback((user) => {
    console.log('handleDeleteUser called with user:', user)
    setDeleteDialogState({ open: true, user: user })
  }, [])

  const confirmDeleteUser = async () => {
    console.log('confirmDeleteUser called with userToDelete:', deleteDialogState.user)
    if (!deleteDialogState.user) return

    try {
      setError('')
      console.log('Calling api.deleteUser with id:', deleteDialogState.user.id)
      await api.deleteUser(deleteDialogState.user.id)
      console.log('User deleted successfully')
      await loadData()
      setDeleteDialogState({ open: false, user: null })
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Ошибка удаления пользователя: ' + error.message)
    }
  }

  const cancelDeleteUser = () => {
    setDeleteDialogState({ open: false, user: null })
  }

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.id === branchId)
    return branch?.name || branchId
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Загрузка пользователей...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Управление пользователями
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Всего пользователей: {users.length}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            disabled={queueStats.status === 'overloaded'}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600
            }}
          >
            Добавить пользователя
          </Button>
          
          {queueStats.size > 0 && (
            <Chip
              label={`Очередь: ${queueStats.size}`}
              color={queueStats.status === 'overloaded' ? 'error' : queueStats.status === 'busy' ? 'warning' : 'info'}
              size="small"
              sx={{ fontWeight: 500 }}
            />
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Пользователь</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Роль</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Должность</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Контакты</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Адрес</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Работает до</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Филиал</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Автомобиль</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Статус смены</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.04)' } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ 
                      bgcolor: 'primary.main', 
                      width: 40, 
                      height: 40,
                      fontSize: '1rem',
                      fontWeight: 600
                    }}>
                      {(user.fullName || 'Неизвестно').split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                        {user.fullName || 'Неизвестно'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {user.id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getRoleText(user.role)} 
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.position || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.phone}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    TG: {user.telegramId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                    {user.address}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.workUntil || 'Не указано'}
                    color={user.workUntil ? 'info' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{getBranchName(user.branchId)}</TableCell>
                <TableCell>
                  {user.carModel ? (
                    <Box>
                      <Typography variant="body2">
                        {user.carModel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.carNumber}
                      </Typography>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {(user.role === 'courier' || user.role === 'passenger') && (
                    userShifts[user.id] ? (
                      <Chip 
                        label="В смене" 
                        color="success" 
                        size="small"
                      />
                    ) : (
                      <Chip 
                        label="Не в смене" 
                        color="default" 
                        size="small"
                        variant="outlined"
                      />
                    )
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title="Изменить данные">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        sx={{ 
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          borderRadius: 1.5
                        }}
                      >
                        <EditNote fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {(user.role === 'courier' || user.role === 'passenger') && !userShifts[user.id] && (
                      <Tooltip title="Поставить в смену">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleAddToShift(user)}
                          sx={{ 
                            bgcolor: 'success.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'success.dark' },
                            borderRadius: 1.5
                          }}
                        >
                          <PersonAdd fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Удалить навсегда">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteUser(user)}
                        sx={{ 
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' },
                          borderRadius: 1.5
                        }}
                      >
                        <DeleteForever fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Telegram ID"
              value={formData.telegramId}
              onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
              required
            />
            
            <TextField
              select
              label="Роль"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <MenuItem value="passenger">Пассажир</MenuItem>
              <MenuItem value="courier">Курьер</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
            </TextField>

            <TextField
              label="Полное имя"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />

            <TextField
              label="Телефон"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />

            <TextField
              label="Адрес"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />

            {formData.role === 'passenger' && (
              <TextField
                label="Должность"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            )}

            <TextField
              label="Работает до (время)"
              value={formData.workUntil}
              onChange={(e) => setFormData({ ...formData, workUntil: e.target.value })}
              placeholder="18:00"
              required
            />

            <TextField
              select
              label="Филиал"
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              required
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>

            {formData.role === 'courier' && (
              <>
                <TextField
                  label="Модель автомобиля"
                  value={formData.carModel}
                  onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                />
                <TextField
                  label="Номер автомобиля"
                  value={formData.carNumber}
                  onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isCreating}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={isCreating || (queueStats.status === 'overloaded' && !editingUser)}
            startIcon={isCreating ? <CircularProgress size={16} /> : null}
          >
            {isCreating ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogState.open} onClose={cancelDeleteUser}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить пользователя{' '}
            <strong>{deleteDialogState.user?.fullName || 'Неизвестно'}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Это действие нельзя отменить. Все связанные смены и маршруты также будут удалены.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteUser}>Отмена</Button>
          <Button onClick={confirmDeleteUser} color="error" variant="contained">
            Удалить пользователя
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default UsersView
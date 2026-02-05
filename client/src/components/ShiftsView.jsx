import React, { useState, useEffect } from 'react'
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
  Alert,
  CircularProgress,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material'
import { Refresh, DeleteForever, RemoveCircle } from '@mui/icons-material'
import api from '../services/api'

function ShiftsView() {
  const [shifts, setShifts] = useState([])
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shiftToDelete, setShiftToDelete] = useState(null)

  useEffect(() => {
    loadData()
    
    // Слушаем событие автообновления
    const handleAutoRefresh = () => {
      loadData()
    }
    
    window.addEventListener('autoRefresh', handleAutoRefresh)
    
    return () => {
      window.removeEventListener('autoRefresh', handleAutoRefresh)
    }
  }, [selectedBranch])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const [shiftsData, usersData, branchesData] = await Promise.all([
        api.getTodayShifts(selectedBranch || null),
        api.getUsers(),
        api.getBranches()
      ])
      
      setShifts(shiftsData)
      setUsers(usersData)
      setBranches(branchesData)
    } catch (error) {
      setError('Ошибка загрузки данных: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getUserById = (userId) => {
    return users.find(user => user.id === userId)
  }

  const getBranchById = (branchId) => {
    return branches.find(branch => branch.id === branchId)
  }

  const getStatusColor = (isWorking) => {
    return isWorking ? 'success' : 'default'
  }

  const getStatusText = (isWorking) => {
    return isWorking ? 'Работает' : 'Не работает'
  }

  const handleDeleteShift = (shift) => {
    setShiftToDelete(shift)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return

    try {
      setError('')
      await api.deleteShift(shiftToDelete.id)
      await loadData()
      setDeleteDialogOpen(false)
      setShiftToDelete(null)
    } catch (error) {
      setError('Ошибка удаления смены: ' + error.message)
    }
  }

  const cancelDeleteShift = () => {
    setDeleteDialogOpen(false)
    setShiftToDelete(null)
  }

  const getRoleText = (role) => {
    const roles = {
      admin: 'Администратор',
      courier: 'Курьер', 
      passenger: 'Пассажир'
    }
    return roles[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: 'error',
      courier: 'primary',
      passenger: 'success'
    }
    return colors[role] || 'default'
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Загрузка смен...</Typography>
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
            Управление сменами
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Сотрудников в смене: {shifts.length}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            select
            label="Филиал"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Все филиалы</MenuItem>
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </TextField>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            sx={{ borderRadius: 2 }}
          >
            Синхронизировать
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {shifts.length === 0 ? (
        <Alert severity="info">
          Сегодня нет активных смен
          {selectedBranch && ` в выбранном филиале`}.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Сотрудник</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Роль</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Должность</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Телефон</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Филиал</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Работает до</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Адрес назначения</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Автомобиль</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shifts.map((shift) => {
                const user = getUserById(shift.userId)
                const branch = getBranchById(shift.branchId)
                
                return (
                  <TableRow key={shift.id} sx={{ '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.04)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          bgcolor: 'primary.main', 
                          width: 40, 
                          height: 40,
                          fontSize: '1rem',
                          fontWeight: 600
                        }}>
                          {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="600" sx={{ mb: 0.5 }}>
                            {user?.fullName || 'Неизвестный пользователь'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user?.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleText(user?.role)}
                        color={getRoleColor(user?.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user?.position || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user?.phone}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        TG: {shift.telegramId}
                      </Typography>
                    </TableCell>
                    <TableCell>{branch?.name || shift.branchId}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user?.workUntil || 'Не указано'}
                        color={user?.workUntil ? 'info' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                        {shift.destinationAddress || 'Не указан'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(shift.isWorking)}
                        color={getStatusColor(shift.isWorking)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user?.carModel ? (
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
                      <Tooltip title="Снять со смены">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteShift(shift)}
                          sx={{ 
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            borderRadius: 1.5
                          }}
                        >
                          <RemoveCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Смены обновляются автоматически при регистрации через Telegram бот.
          Курьеры могут начать смену командой /shift в боте.
        </Typography>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteShift}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите убрать со смены пользователя{' '}
            <strong>{users.find(u => u.id === shiftToDelete?.userId)?.fullName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteShift}>Отмена</Button>
          <Button onClick={confirmDeleteShift} color="error" variant="contained">
            Убрать со смены
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ShiftsView
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Badge,
  Divider
} from '@mui/material'
import { Add, EditNote, Refresh, DeleteForever, Phone, DirectionsCar, Schedule, ExpandMore, Group, ViewList } from '@mui/icons-material'
import CreateAssignmentWizard from './CreateAssignmentWizard'
import api from '../services/api'

function AssignmentsView() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [availableCouriers, setAvailableCouriers] = useState([])
  const [availablePassengers, setAvailablePassengers] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState(null)
  const [groupByCourier, setGroupByCourier] = useState(false)
  const [formData, setFormData] = useState({
    courierId: '',
    passengerId: '',
    branchId: '',
    assignedTime: '',
    pickupAddress: '',
    dropoffAddress: ''
  })

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
      
      const [assignmentsData, usersData, branchesData] = await Promise.all([
        api.getTodayAssignments(selectedBranch || null),
        api.getUsers(),
        api.getBranches()
      ])
      
      // Фильтруем только активные назначения (исключаем отмененные и завершенные)
      const activeAssignments = assignmentsData.filter(assignment => 
        assignment.status !== 'cancelled' && assignment.status !== 'completed'
      )
      
      setAssignments(activeAssignments)
      setUsers(usersData)
      setBranches(branchesData)
    } catch (error) {
      setError('Ошибка загрузки данных: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableResources = async (branchId) => {
    if (!branchId) return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const [couriers, passengers] = await Promise.all([
        api.getAvailableCouriers(today, branchId),
        api.getAvailablePassengers(today, branchId)
      ])
      
      setAvailableCouriers(couriers)
      setAvailablePassengers(passengers)
    } catch (error) {
      console.error('Failed to load available resources:', error)
    }
  }

  const handleOpenDialog = async (assignment = null) => {
    if (assignment) {
      setEditingAssignment(assignment)
      
      // Преобразуем timestamp в формат времени HH:MM для input type="time"
      let timeValue = new Date().toISOString().slice(11, 16) // По умолчанию текущее время
      if (assignment.assignedTime) {
        try {
          const date = new Date(assignment.assignedTime)
          timeValue = date.toISOString().slice(11, 16)
        } catch (e) {
          console.warn('Failed to parse assignedTime:', assignment.assignedTime)
        }
      }
      
      setFormData({
        courierId: assignment.courierId,
        passengerId: assignment.passengerId,
        branchId: assignment.branchId,
        assignedTime: timeValue,
        pickupAddress: assignment.pickupAddress,
        dropoffAddress: assignment.dropoffAddress
      })
      await loadAvailableResources(assignment.branchId)
    } else {
      setEditingAssignment(null)
      const defaultBranch = branches[0]?.id || ''
      setFormData({
        courierId: '',
        passengerId: '',
        branchId: defaultBranch,
        assignedTime: new Date().toISOString().slice(11, 16), // Формат HH:MM для input type="time"
        pickupAddress: '',
        dropoffAddress: ''
      })
      if (defaultBranch) {
        await loadAvailableResources(defaultBranch)
      }
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingAssignment(null)
    setError('')
  }

  const handleSave = async () => {
    try {
      setError('')
      
      // Преобразуем время в полный timestamp
      const today = new Date().toISOString().split('T')[0]
      const assignedDateTime = `${today}T${formData.assignedTime}:00.000Z`
      
      const dataToSend = {
        ...formData,
        assignedTime: assignedDateTime,
        date: today // Добавляем дату
      }
      
      if (editingAssignment) {
        await api.updateAssignment(editingAssignment.id, dataToSend)
      } else {
        await api.createAssignment(dataToSend)
      }
      
      await loadData()
      handleCloseDialog()
    } catch (error) {
      setError('Ошибка сохранения: ' + error.message)
    }
  }

  const handleDeleteAssignment = (assignment) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return

    try {
      setError('')
      await api.deleteAssignment(assignmentToDelete.id)
      await loadData()
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
    } catch (error) {
      setError('Ошибка удаления: ' + error.message)
    }
  }

  const cancelDeleteAssignment = () => {
    setDeleteDialogOpen(false)
    setAssignmentToDelete(null)
  }

  const getUserById = (userId) => {
    return users.find(user => user.id === userId)
  }

  const getBranchName = (branchId) => {
    const branch = branches.find(branch => branch.id === branchId)
    return branch?.name || branchId
  }

  const getStatusColor = (status) => {
    const colors = {
      assigned: 'warning',
      cancelled: 'error'
    }
    return colors[status] || 'default'
  }

  const getStatusText = (status) => {
    const texts = {
      assigned: 'Назначено',
      cancelled: 'Отменено'
    }
    return texts[status] || status
  }

  // Группировка маршрутов по курьерам
  const groupAssignmentsByCourier = () => {
    const grouped = {}
    
    assignments.forEach(assignment => {
      const courierId = assignment.courierId
      if (!grouped[courierId]) {
        const courier = getUserById(courierId)
        grouped[courierId] = {
          courier,
          assignments: []
        }
      }
      grouped[courierId].assignments.push(assignment)
    })
    
    // Сортируем группы по имени курьера
    return Object.entries(grouped).sort(([, a], [, b]) => {
      const nameA = a.courier?.fullName || 'Неизвестный курьер'
      const nameB = b.courier?.fullName || 'Неизвестный курьер'
      return nameA.localeCompare(nameB)
    })
  }

  // Компонент для отображения одного маршрута
  const AssignmentRow = ({ assignment, showCourier = true }) => {
    const courier = getUserById(assignment.courierId)
    const passenger = getUserById(assignment.passengerId)
    
    return (
      <TableRow key={assignment.id}>
        {showCourier && (
          <TableCell>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {courier?.fullName || 'Неизвестный курьер'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <DirectionsCar fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {courier?.carModel} ({courier?.carNumber})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Phone fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {courier?.phone}
                </Typography>
              </Box>
            </Box>
          </TableCell>
        )}
        <TableCell>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {passenger?.fullName || 'Неизвестный пассажир'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {passenger?.position || 'Должность не указана'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Phone fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {passenger?.phone}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                До {passenger?.workUntil || 'не указано'}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Chip 
            label={assignment.assignedTime}
            color="primary"
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Box sx={{ maxWidth: 250 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              📍 <strong>Откуда:</strong> {assignment.pickupAddress}
            </Typography>
            <Typography variant="body2">
              🎯 <strong>Куда:</strong> {assignment.dropoffAddress}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>{getBranchName(assignment.branchId)}</TableCell>
        <TableCell>
          <Chip 
            label={getStatusText(assignment.status)}
            color={getStatusColor(assignment.status)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Chip 
              label={assignment.confirmedByCourier ? '✅ Курьер' : '⏳ Курьер'}
              color={assignment.confirmedByCourier ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
            <Chip 
              label={assignment.confirmedByPassenger ? '✅ Пассажир' : '⏳ Пассажир'}
              color={assignment.confirmedByPassenger ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Изменить маршрут">
              <IconButton
                size="small"
                onClick={() => handleOpenDialog(assignment)}
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
            <Tooltip title="Отменить маршрут">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteAssignment(assignment)}
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
    )
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Загрузка маршрутов...</Typography>
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
            Управление маршрутами
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Активных маршрутов на сегодня: {assignments.length}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
          
          <FormControlLabel
            control={
              <Switch
                checked={groupByCourier}
                onChange={(e) => setGroupByCourier(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {groupByCourier ? <Group /> : <ViewList />}
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {groupByCourier ? 'По курьерам' : 'Список'}
                </Typography>
              </Box>
            }
          />
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setWizardOpen(true)}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600
            }}
          >
            Создать маршрут
          </Button>
          
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

      {assignments.length === 0 ? (
        <Alert severity="info">
          На сегодня нет маршрутов
          {selectedBranch && ` в выбранном филиале`}.
        </Alert>
      ) : groupByCourier ? (
        // Группированный вид по курьерам
        <Box>
          {groupAssignmentsByCourier().map(([courierId, group]) => {
            const { courier, assignments: courierAssignments } = group
            const totalCount = courierAssignments.length
            
            return (
              <Accordion key={courierId} defaultExpanded sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DirectionsCar color="action" />
                      <Typography variant="h6">
                        {courier?.fullName || 'Неизвестный курьер'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Badge badgeContent={totalCount} color="primary">
                        <Chip 
                          label="Поездки" 
                          size="small" 
                          variant="outlined"
                        />
                      </Badge>
                    </Box>
                    
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {courier?.carModel} ({courier?.carNumber})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {courier?.phone}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ pt: 0 }}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Пассажир</TableCell>
                          <TableCell>Время подачи</TableCell>
                          <TableCell>Маршрут</TableCell>
                          <TableCell>Филиал</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Подтверждения</TableCell>
                          <TableCell>Действия</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {courierAssignments
                          .sort((a, b) => a.assignedTime.localeCompare(b.assignedTime))
                          .map((assignment) => (
                            <AssignmentRow 
                              key={assignment.id} 
                              assignment={assignment} 
                              showCourier={false}
                            />
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      ) : (
        // Обычный табличный вид
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Курьер</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Пассажир</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Время подачи</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Маршрут</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Филиал</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Подтверждения</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateAssignmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={loadData}
      />

      {/* Edit Assignment Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Редактировать маршрут
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Филиал"
              value={formData.branchId}
              onChange={(e) => {
                setFormData({ ...formData, branchId: e.target.value })
                loadAvailableResources(e.target.value)
              }}
              required
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Курьер"
              value={formData.courierId}
              onChange={(e) => setFormData({ ...formData, courierId: e.target.value })}
              required
            >
              {availableCouriers.map((courier) => (
                <MenuItem key={courier.id} value={courier.id}>
                  {courier.fullName} - {courier.carModel} ({courier.carNumber})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Пассажир"
              value={formData.passengerId}
              onChange={(e) => setFormData({ ...formData, passengerId: e.target.value })}
              required
            >
              {availablePassengers.map((passenger) => (
                <MenuItem key={passenger.id} value={passenger.id}>
                  {passenger.fullName} - {passenger.phone}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Время подачи"
              type="time"
              value={formData.assignedTime}
              onChange={(e) => setFormData({ ...formData, assignedTime: e.target.value })}
              required
            />

            <TextField
              label="Адрес подачи"
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              required
              multiline
              rows={2}
            />

            <TextField
              label="Адрес назначения"
              value={formData.dropoffAddress}
              onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
              required
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteAssignment}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить маршрут?
          </Typography>
          {assignmentToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Курьер:</strong> {users.find(u => u.id === assignmentToDelete.courierId)?.fullName}
              </Typography>
              <Typography variant="body2">
                <strong>Пассажир:</strong> {users.find(u => u.id === assignmentToDelete.passengerId)?.fullName}
              </Typography>
              <Typography variant="body2">
                <strong>Время:</strong> {assignmentToDelete.assignedTime}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAssignment}>Отмена</Button>
          <Button onClick={confirmDeleteAssignment} color="error" variant="contained">
            Удалить маршрут
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AssignmentsView
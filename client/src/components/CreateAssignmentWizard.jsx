import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material'
import {
  Business,
  DirectionsCar,
  Person,
  Check,
  Add,
  Remove
} from '@mui/icons-material'
import api from '../services/api'

const steps = ['Выбор филиала', 'Выбор курьера', 'Выбор пассажиров']

function CreateAssignmentWizard({ open, onClose, onSuccess }) {
  const [activeStep, setActiveStep] = useState(0)
  const [branches, setBranches] = useState([])
  const [availableCouriers, setAvailableCouriers] = useState([])
  const [availablePassengers, setAvailablePassengers] = useState([])
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [selectedCourier, setSelectedCourier] = useState(null)
  const [selectedPassengers, setSelectedPassengers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadBranches()
      resetWizard()
    }
  }, [open])

  const resetWizard = () => {
    setActiveStep(0)
    setSelectedBranch(null)
    setSelectedCourier(null)
    setSelectedPassengers([])
    setError('')
  }

  const loadBranches = async () => {
    try {
      const branchesData = await api.getBranches()
      setBranches(branchesData)
    } catch (error) {
      setError('Ошибка загрузки филиалов: ' + error.message)
    }
  }

  const loadCouriers = async (branchId) => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const couriers = await api.getAvailableCouriers(today, branchId)
      setAvailableCouriers(couriers)
    } catch (error) {
      setError('Ошибка загрузки курьеров: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPassengers = async (branchId) => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const passengers = await api.getAvailablePassengers(today, branchId)
      setAvailablePassengers(passengers)
    } catch (error) {
      setError('Ошибка загрузки пассажиров: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch)
    loadCouriers(branch.id)
    setActiveStep(1)
  }

  const handleCourierSelect = (courier) => {
    setSelectedCourier(courier)
    loadPassengers(selectedBranch.id)
    setActiveStep(2)
  }

  const handlePassengerToggle = (passenger) => {
    setSelectedPassengers(prev => {
      const isSelected = prev.find(p => p.id === passenger.id)
      if (isSelected) {
        return prev.filter(p => p.id !== passenger.id)
      } else {
        return [...prev, passenger]
      }
    })
  }

  const handleCreateAssignments = async () => {
    if (selectedPassengers.length === 0) {
      setError('Выберите хотя бы одного пассажира')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Создаем маршрут для каждого пассажира
      for (const passenger of selectedPassengers) {
        // Преобразуем время в полную дату и время
        const today = new Date().toISOString().split('T')[0] // Получаем сегодняшнюю дату в формате YYYY-MM-DD
        const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        const assignedDateTime = `${today}T${currentTime}:00.000Z` // Создаем полный timestamp
        
        const assignmentData = {
          courierId: selectedCourier.id,
          passengerId: passenger.id,
          branchId: selectedBranch.id,
          assignedTime: assignedDateTime,
          date: today, // Добавляем дату
          pickupAddress: selectedBranch.address, // Адрес филиала
          dropoffAddress: passenger.address // Адрес пассажира
        }
        
        await api.createAssignment(assignmentData)
      }

      onSuccess()
      onClose()
    } catch (error) {
      setError('Ошибка создания маршрутов: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (activeStep === 2) {
      setSelectedPassengers([])
      setActiveStep(1)
    } else if (activeStep === 1) {
      setSelectedCourier(null)
      setActiveStep(0)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Выберите филиал
            </Typography>
            <Grid container spacing={2}>
              {branches.map((branch) => (
                <Grid item xs={12} sm={6} md={4} key={branch.id}>
                  <Card 
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => handleBranchSelect(branch)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Business color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          {branch.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        📍 {branch.address}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📞 {branch.phone}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Выберите курьера из {selectedBranch?.name}
            </Typography>
            {availableCouriers.length === 0 ? (
              <Alert severity="warning">
                В этом филиале нет доступных курьеров. Убедитесь, что курьеры добавлены в смену.
              </Alert>
            ) : (
              <List>
                {availableCouriers.map((courier) => (
                  <ListItem key={courier.id} disablePadding>
                    <ListItemButton onClick={() => handleCourierSelect(courier)}>
                      <DirectionsCar color="primary" sx={{ mr: 2 }} />
                      <ListItemText
                        primary={courier.fullName}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              📞 {courier.phone}
                            </Typography>
                            <Typography variant="body2">
                              🚗 {courier.carModel} ({courier.carNumber})
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Выберите пассажиров для {selectedCourier?.fullName}
            </Typography>
            
            {selectedPassengers.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Выбранные пассажиры ({selectedPassengers.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPassengers.map((passenger) => (
                    <Chip
                      key={passenger.id}
                      label={passenger.fullName}
                      onDelete={() => handlePassengerToggle(passenger)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Divider sx={{ my: 2 }} />
              </Box>
            )}

            {availablePassengers.length === 0 ? (
              <Alert severity="info">
                Все пассажиры из этого филиала уже назначены.
              </Alert>
            ) : (
              <List>
                {availablePassengers.map((passenger) => {
                  const isSelected = selectedPassengers.find(p => p.id === passenger.id)
                  return (
                    <ListItem key={passenger.id} disablePadding>
                      <ListItemButton onClick={() => handlePassengerToggle(passenger)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          {isSelected ? (
                            <Remove color="error" sx={{ mr: 2 }} />
                          ) : (
                            <Add color="success" sx={{ mr: 2 }} />
                          )}
                          <Person color="primary" sx={{ mr: 2 }} />
                          <ListItemText
                            primary={passenger.fullName}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  📞 {passenger.phone}
                                </Typography>
                                <Typography variant="body2">
                                  📍 {passenger.address}
                                </Typography>
                              </Box>
                            }
                          />
                          {isSelected && (
                            <Check color="success" />
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            )}

            {selectedPassengers.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Маршрут:
                </Typography>
                <Typography variant="body2">
                  🏢 Отправление: {selectedBranch.address}
                </Typography>
                {selectedPassengers.map((passenger, index) => (
                  <Typography key={passenger.id} variant="body2">
                    📍 Остановка {index + 1}: {passenger.address} ({passenger.fullName})
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Создание маршрута
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity={error.startsWith('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Отмена
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Назад
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={handleCreateAssignments}
            disabled={loading || selectedPassengers.length === 0}
          >
            {loading ? 'Создание...' : `Создать маршруты (${selectedPassengers.length})`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default CreateAssignmentWizard
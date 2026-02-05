import React from 'react'
import {
  Snackbar,
  Alert,
  AlertTitle,
  Slide
} from '@mui/material'

function SlideTransition(props) {
  return <Slide {...props} direction="up" />
}

function NotificationSnackbar({ 
  open, 
  onClose, 
  message, 
  severity = 'info', 
  title,
  autoHideDuration = 6000 
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity} 
        variant="filled"
        sx={{ 
          minWidth: 300,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          '& .MuiAlert-icon': {
            fontSize: '1.5rem'
          }
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  )
}

export default NotificationSnackbar
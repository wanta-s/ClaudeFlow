import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface SnackbarState {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'warning' | 'info'
}

interface UIState {
  snackbar: SnackbarState
  drawerOpen: boolean
}

const initialState: UIState = {
  snackbar: {
    open: false,
    message: '',
    severity: 'info',
  },
  drawerOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showSnackbar: (
      state,
      action: PayloadAction<{
        message: string
        severity?: SnackbarState['severity']
      }>
    ) => {
      state.snackbar = {
        open: true,
        message: action.payload.message,
        severity: action.payload.severity || 'info',
      }
    },
    hideSnackbar: (state) => {
      state.snackbar.open = false
    },
    toggleDrawer: (state) => {
      state.drawerOpen = !state.drawerOpen
    },
    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.drawerOpen = action.payload
    },
  },
})

export const { showSnackbar, hideSnackbar, toggleDrawer, setDrawerOpen } =
  uiSlice.actions
export default uiSlice.reducer
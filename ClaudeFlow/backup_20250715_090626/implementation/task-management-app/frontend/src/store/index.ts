import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import taskReducer from './slices/taskSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
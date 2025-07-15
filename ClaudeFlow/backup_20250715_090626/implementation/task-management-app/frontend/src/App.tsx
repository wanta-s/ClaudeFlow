import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, CircularProgress } from '@mui/material'
import { RootState, AppDispatch } from './store'
import { setUser, setLoading } from './store/slices/authSlice'
import { authService } from './services/authService'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Profile from './pages/Profile'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  )

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const user = await authService.getMe()
          dispatch(setUser(user))
        } catch (error) {
          localStorage.removeItem('token')
        }
      }
      dispatch(setLoading(false))
    }

    checkAuth()
  }, [dispatch])

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to="/" />}
      />
      <Route
        path="/register"
        element={!isAuthenticated ? <Register /> : <Navigate to="/" />}
      />
      <Route
        path="/"
        element={
          isAuthenticated ? <Layout /> : <Navigate to="/login" />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
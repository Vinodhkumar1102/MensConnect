import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import BloodList from './pages/BloodRequests/List'

function PrivateRoute({ children }) {
  let token = null
  try { token = localStorage.getItem('admin_token') } catch (e) {}
  if (!token) {
    try { token = sessionStorage.getItem('admin_token') } catch (e) {}
  }
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <BloodList />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

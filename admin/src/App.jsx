import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import BloodList from './pages/BloodRequests/List'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('admin_token')
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
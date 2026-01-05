import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../api'
import './login.css'
import logo from '../../../admin/src/assets/logo.jpg'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('admin_email')
    if (savedEmail) setEmail(savedEmail)
  }, [])

  // prevent body scrolling while login is displayed
  useEffect(() => {
    document.body.classList.add('lock-scroll')
    return () => {
      document.body.classList.remove('lock-scroll')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    try {
      setLoading(true)
      const res = await loginAdmin({ email, password })
      const token = res?.data?.token
      if (!token) throw new Error('Invalid response')

      if (remember) {
        localStorage.setItem('admin_token', token)
        localStorage.setItem('admin_email', email)
      } else {
        sessionStorage.setItem('admin_token', token)
      }

      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
  }

  return (
    <div className="login-page">
      <header className="page-header">
        <img src={logo} alt="MensConnect logo" className="header-logo" />
        <h1>BLOOD MANAGEMENT SYSTEM</h1>
      </header>
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-inner">
            <div className="login-card-header">
              <h2>Admin Login</h2>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-grid">
                <label className="form-label"><span className="emoji emoji-lg emoji-mail">✉️</span> Email</label>
                <input
                  type="email"
                  placeholder="admin@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  required
                />

                <label className="form-label"><span className="emoji emoji-lg emoji-lock">🔒</span> Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />

                <div className="button-row">
                  <button type="submit" disabled={loading} className="login-btn">
                    {loading ? 'Signing in…' : 'Login'}
                  </button>
                </div>
                <div className="below-button-text">There is a Hope of Life To SomeOne in Your Blood Donation</div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="card-below-text">GIVE BLOOD - SAVE LIFE !!</div>

      <footer className="fixed-footer">
        <div className="footer-copy">
          {/* <span className="footer-total">Total: 0</span> */}
          <span className="footer-text">© {new Date().getFullYear()} All Rights Reserved by Datavibes SoftTech Pvt Ltd.</span>
        </div>
      </footer>
    </div>
  )
}
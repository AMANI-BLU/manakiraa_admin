import { Routes, Route } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Verifications from './pages/Verifications'
import Login from './pages/Login'
import { AuthGuard } from './core/AuthGuard'
import Settings from './pages/Settings'
import AddProperty from './pages/AddProperty'
import Messages from './pages/Messages'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <AuthGuard>
          <AdminLayout />
        </AuthGuard>
      }>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/add" element={<AddProperty />} />
        <Route path="messages" element={<Messages />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App

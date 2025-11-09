import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from './routes/SearchView'
import Results from './routes/ResultsView'
import Profile from './routes/Profile'
import Login from './routes/Login'
import Register from './routes/Register'
import ForgotPassword from './routes/ForgotPassword'
import ResetPassword from './routes/ResetPassword'
import { ProtectedRoute } from './lib/authGuard'

export default createBrowserRouter([
{
path: '/', element: <App />, children: [
{ path: 'login', element: <Login /> },
{ path: 'register', element: <Register /> },
{ path: 'forgot-password', element: <ForgotPassword /> },
{ path: 'reset-password', element: <ResetPassword /> },
{ index: true, element: <ProtectedRoute><Home /></ProtectedRoute> },
{ path: 'results', element: <ProtectedRoute><Results /></ProtectedRoute> },
{ path: 'profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
]

}
])

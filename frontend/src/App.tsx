// frontend/src/App.tsx
import SearchView from './routes/SearchView'
import ResultsView from './routes/ResultsView'
import WeatherTab from './routes/WeatherTab'

// auth split views
import Login from './routes/Login'
import Register from './routes/Register'
import Profile from './routes/Profile'
import { Link, Outlet } from 'react-router-dom'
export default function App() {
return (
<div className="min-h-screen bg-slate-50 text-slate-900">
<header className="border-b bg-white">
<div className="max-w-5xl mx-auto px-4 py-3 flex gap-6 items-center">
<Link to="/" className="font-semibold">ParkLah!</Link>
<nav className="flex gap-4 text-sm">
<Link to="/weather">Weather</Link>
<Link to="/profile">Profile</Link>
<Link to="/login">Login</Link>
</nav>
</div>
</header>
<main className="max-w-5xl mx-auto p-4">
<Outlet />
</main>
</div>
)
}

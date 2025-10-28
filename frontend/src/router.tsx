import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Home from './routes/SearchView'
import Results from './routes/ResultsView'
import Weather from './routes/WeatherTab'
import Profile from './routes/Profile'
import Login from './routes/Login'
import Register from './routes/Register'
export default createBrowserRouter([
{
path: '/', element: <App />, children: [
{ index: true, element: <Home /> },
{ path: 'results', element: <Results /> },
{ path: 'weather', element: <Weather /> },
{ path: 'profile', element: <Profile /> },
{ path: 'login', element: <Login /> },
{ path: 'register', element: <Register /> }
]

}
])

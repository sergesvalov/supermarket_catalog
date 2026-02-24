import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import ProductsPage from './components/ProductsPage'
import ListsPage from './components/ListsPage'
import ShopsPage from './components/ShopsPage'
import AdminPage from './components/AdminPage'
import ReportsPage from './components/ReportsPage'
import { AppProvider } from './context/AppContext'

function App() {
    return (
        <AppProvider>
            <Router>
                <div className="container py-5">
                    <h2 className="mb-4 fw-bold text-white text-shadow-sm">🛒 Supermarket Catalog</h2>

                    <div className="glass-card p-2 mb-4 d-inline-block">
                        <ul className="nav nav-pills" role="tablist">
                            <li className="nav-item">
                                <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    📦 Товары
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/lists" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    📝 Списки
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/shops" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    🏪 Магазины
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    📊 Отчёты
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                    <i className="bi bi-gear me-1"></i> Админ
                                </NavLink>
                            </li>
                        </ul>
                    </div>

                    <div className="tab-content">
                        <Routes>
                            <Route path="/" element={<Navigate to="/products" replace />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route path="/lists" element={<ListsPage />} />
                            <Route path="/shops" element={<ShopsPage />} />
                            <Route path="/reports" element={<ReportsPage />} />
                            <Route path="/admin" element={<AdminPage />} />
                        </Routes>
                    </div>
                </div>
            </Router>
        </AppProvider>
    )
}

export default App

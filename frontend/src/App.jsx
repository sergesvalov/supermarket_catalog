import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
const ProductsPage = lazy(() => import('./components/ProductsPage'));
const ListsPage = lazy(() => import('./components/ListsPage'));
const ShopsPage = lazy(() => import('./components/ShopsPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
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
                        <Suspense fallback={<div className="text-center p-5"><div className="spinner-border text-light" role="status"></div></div>}>
                            <Routes>
                                <Route path="/" element={<Navigate to="/products" replace />} />
                                <Route path="/products" element={<ProductsPage />} />
                                <Route path="/lists" element={<ListsPage />} />
                                <Route path="/shops" element={<ShopsPage />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/admin" element={<AdminPage />} />
                            </Routes>
                        </Suspense>
                    </div>
                </div>
            </Router>
        </AppProvider>
    )
}

export default App

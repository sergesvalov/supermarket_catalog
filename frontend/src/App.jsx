import { useState } from 'react'
import ProductsPage from './components/ProductsPage'
import ListsPage from './components/ListsPage'
import ShopsPage from './components/ShopsPage'
import AdminPage from './components/AdminPage'
import { AppProvider } from './context/AppContext'

function App() {
    const [activeTab, setActiveTab] = useState('products')

    const renderContent = () => {
        switch (activeTab) {
            case 'products': return <ProductsPage />
            case 'lists': return <ListsPage />
            case 'shops': return <ShopsPage />
            case 'admin': return <AdminPage />
            default: return <ProductsPage />
        }
    }

    return (
        <AppProvider>
            <div className="container py-5">
                <h2 className="mb-4 fw-bold text-white text-shadow-sm">🛒 Supermarket Catalog</h2>

                <div className="glass-card p-2 mb-4 d-inline-block">
                    <ul className="nav nav-pills" role="tablist">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
                                onClick={() => setActiveTab('products')}
                            >
                                📦 Товары
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'lists' ? 'active' : ''}`}
                                onClick={() => setActiveTab('lists')}
                            >
                                📝 Списки
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'shops' ? 'active' : ''}`}
                                onClick={() => setActiveTab('shops')}
                            >
                                🏪 Магазины
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                                onClick={() => setActiveTab('admin')}
                            >
                                <i className="bi bi-gear me-1"></i> Админ
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="tab-content">
                    {renderContent()}
                </div>
            </div>
        </AppProvider>
    )
}

export default App

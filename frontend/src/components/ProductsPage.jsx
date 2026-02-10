import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api';

const ProductsPage = () => {
    const { products, shops, currency, refreshProducts } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');

    // New Product Form State
    const [newProduct, setNewProduct] = useState({
        name: '', shop_id: '', price: '', weight: '', calories: '', quantity: ''
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.products.create({
                ...newProduct,
                shop_id: newProduct.shop_id ? parseInt(newProduct.shop_id) : null,
                price: parseFloat(newProduct.price),
                weight: newProduct.weight ? parseInt(newProduct.weight) : null,
                calories: newProduct.calories ? parseInt(newProduct.calories) : null,
                quantity: newProduct.quantity ? parseInt(newProduct.quantity) : 1
            });
            setNewProduct({ name: '', shop_id: '', price: '', weight: '', calories: '', quantity: '' });
            refreshProducts();
        } catch (error) {
            alert("Error creating product: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Удалить товар?')) return;
        try {
            await api.products.delete(id);
            refreshProducts();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
    };

    // Filter and Sort
    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'price') return a.price - b.price;
            if (sortBy === 'shop') return (a.shop?.name || '').localeCompare(b.shop?.name || '');
            return new Date(b.created_at) - new Date(a.created_at);
        });

    return (
        <div className="row">
            {/* Add Product Form */}
            <div className="col-md-4 mb-4">
                <div className="glass-card p-4 sticky-top" style={{ top: '20px' }}>
                    <h5 className="mb-3 fw-bold">✨ Добавить товар</h5>
                    <form onSubmit={handleCreate}>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Название</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Магазин</label>
                            <select
                                className="form-select form-control"
                                value={newProduct.shop_id}
                                onChange={e => setNewProduct({ ...newProduct, shop_id: e.target.value })}
                            >
                                <option value="">-- Не выбрано --</option>
                                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted">Цена ({currency})</label>
                            <input
                                type="number" step="0.01"
                                className="form-control"
                                value={newProduct.price}
                                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                required
                            />
                        </div>
                        <div className="row mb-3">
                            <div className="col-4">
                                <label className="form-label small text-muted">Вес(г)</label>
                                <input type="number" className="form-control px-2" placeholder="..."
                                    value={newProduct.weight}
                                    onChange={e => setNewProduct({ ...newProduct, weight: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Ккал</label>
                                <input type="number" className="form-control px-2" placeholder="..."
                                    value={newProduct.calories}
                                    onChange={e => setNewProduct({ ...newProduct, calories: e.target.value })}
                                />
                            </div>
                            <div className="col-4">
                                <label className="form-label small text-muted">Шт.</label>
                                <input type="number" className="form-control px-2" placeholder="..."
                                    value={newProduct.quantity}
                                    onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-premium w-100">Добавить</button>
                    </form>
                </div>
            </div>

            {/* Product List */}
            <div className="col-md-8">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <input
                        type="text"
                        className="form-control w-50"
                        placeholder="🔍 Поиск товаров..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-select w-auto"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="date">📅 По дате</option>
                        <option value="shop">🏪 По магазину</option>
                        <option value="price">💰 По цене</option>
                    </select>
                </div>

                <div className="d-flex flex-column gap-3">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="glass-card p-3 d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="mb-1 fw-bold">{p.name}</h6>
                                <div className="small text-muted">
                                    <span className="badge bg-light text-dark border me-2">
                                        {p.shop ? p.shop.name : 'Без магазина'}
                                    </span>
                                    {p.weight && <span className="me-2 text-secondary">{p.weight}г</span>}
                                    {p.calories && <span className="text-secondary">{p.calories} ккал</span>}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <span className="fs-5 fw-bold text-primary">
                                    {p.price.toFixed(2)} {currency}
                                </span>
                                <button
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={() => handleDelete(p.id)}
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="text-center text-muted py-5">
                            Товары не найдены
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductsPage;

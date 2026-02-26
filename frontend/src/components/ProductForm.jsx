import React from 'react';

const ProductForm = ({
    formData,
    setFormData,
    categories,
    shops,
    editingProduct,
    getShopCurrencyById,
    openCategoryEditor,
    handleSubmit,
    resetForm
}) => {
    return (
        <div className="glass-card p-4 sticky-top overflow-y-auto" style={{ top: '20px', maxHeight: 'calc(100vh - 40px)' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                    {editingProduct ? '✏️ Редактировать' : '✨ Добавить товар'}
                </h5>
                {editingProduct && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
                        Отмена
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label small text-muted">Название</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label small text-muted">Категория</label>
                    <div className="input-group">
                        <select
                            className="form-select form-control"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <button type="button" className="btn btn-outline-secondary" onClick={openCategoryEditor} title="Редактор категорий">
                            ⚙️
                        </button>
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label small text-muted">Магазин</label>
                    <select
                        className="form-select form-control"
                        value={formData.shop_id}
                        onChange={e => setFormData({ ...formData, shop_id: e.target.value })}
                    >
                        <option value="">-- Не выбрано --</option>
                        {shops.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-3">
                    <label className="form-label small text-muted">Цена</label>
                    <div className="input-group">
                        <input
                            type="number" step="0.01" min="0"
                            className="form-control"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                        <span className="input-group-text">{getShopCurrencyById(formData.shop_id)}</span>
                    </div>
                </div>
                <div className="row mb-3">
                    <div className="col-6">
                        <label className="form-label small text-muted">Вес / Объем</label>
                        <div className="input-group">
                            <input type="number" step="0.1" min="0" className="form-control" placeholder="..."
                                value={formData.weight}
                                onChange={e => setFormData({ ...formData, weight: e.target.value })}
                            />
                            <select
                                className="form-select px-1 bg-light text-dark"
                                style={{ maxWidth: '60px' }}
                                value={formData.weightUnit}
                                onChange={e => setFormData({ ...formData, weightUnit: e.target.value })}
                            >
                                <option value="g">г</option>
                                <option value="kg">кг</option>
                                <option value="ml">мл</option>
                                <option value="l">л</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-6">
                        <label className="form-label small text-muted">Ккал</label>
                        <input type="number" step="0.1" min="0" className="form-control" placeholder="..."
                            value={formData.calories}
                            onChange={e => setFormData({ ...formData, calories: e.target.value })}
                        />
                    </div>
                </div>
                <div className="row mb-3">
                    <div className="col-4">
                        <label className="form-label small text-muted">Белки</label>
                        <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                            value={formData.proteins}
                            onChange={e => setFormData({ ...formData, proteins: e.target.value })}
                        />
                    </div>
                    <div className="col-4">
                        <label className="form-label small text-muted">Жиры</label>
                        <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                            value={formData.fats}
                            onChange={e => setFormData({ ...formData, fats: e.target.value })}
                        />
                    </div>
                    <div className="col-4">
                        <label className="form-label small text-muted">Углеводы</label>
                        <input type="number" className="form-control px-2" placeholder="..." step="0.1" min="0"
                            value={formData.carbs}
                            onChange={e => setFormData({ ...formData, carbs: e.target.value })}
                        />
                    </div>
                </div>
                <div className="row mb-3">
                    <div className="col-4">
                        <label className="form-label small text-muted">Шт.</label>
                        <input type="number" step="1" min="0" className="form-control px-2" placeholder="..."
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                        />
                    </div>
                </div>
                <button type="submit" className={`btn w-100 ${editingProduct ? 'btn-warning text-white' : 'btn-premium'}`}>
                    {editingProduct ? 'Сохранить изменения' : 'Добавить'}
                </button>
            </form>
        </div>
    );
};

export default ProductForm;

import React from 'react';

const ProductCard = ({ product, getCategoryColor, getProductCurrency, handleEdit, handleViewHistory, handleDelete }) => {
    return (
        <div
            className="glass-card p-3 d-flex justify-content-between align-items-center"
            onClick={() => handleEdit(product)}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <div>
                <h6 className="mb-1 fw-bold">
                    {product.name}
                    <span className={`badge ms-2 ${getCategoryColor(product.category || 'продукты')}`} style={{ fontSize: '0.7em' }}>
                        {product.category || 'продукты'}
                    </span>
                </h6>
                <div className="small text-muted">
                    <span className="badge bg-light text-dark border me-2">
                        {product.shop ? product.shop.name : 'Без магазина'}
                    </span>
                    {product.weight && (
                        <span className="me-2 text-secondary">
                            {product.weight >= 1000 ? `${product.weight / 1000} кг/л` : `${product.weight} г/мл`}
                        </span>
                    )}
                    {product.calories && <span className="text-secondary me-2">{product.calories} ккал</span>}
                    {(product.proteins || product.fats || product.carbs) && (
                        <div className="d-inline-block text-muted" style={{ fontSize: '0.8em' }}>
                            Б: {product.proteins || '-'} / Ж: {product.fats || '-'} / У: {product.carbs || '-'}
                        </div>
                    )}
                </div>
            </div>
            <div className="d-flex align-items-center gap-2">
                <span className="fs-5 fw-bold text-primary me-3">
                    {product.price.toFixed(2)} {getProductCurrency(product)}
                </span>
                <button
                    className="btn btn-outline-info btn-sm rounded-circle me-1"
                    onClick={(e) => handleViewHistory(e, product)}
                    title="История цен"
                >
                    <i className="bi bi-clock-history"></i>
                </button>

                <button
                    className="btn btn-outline-danger btn-sm rounded-circle"
                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id, product); }}
                    title="Удалить"
                >
                    <i className="bi bi-trash"></i>
                </button>
            </div>
        </div>
    );
};

export default ProductCard;

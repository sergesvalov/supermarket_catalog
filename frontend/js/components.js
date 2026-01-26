import { formatCurrency, formatDate } from './utils.js';

export function ProductCard(p) {
    let badges = '';
    if (p.quantity) badges += `<span class="badge bg-light text-dark border me-1">📦 ${p.quantity} шт</span>`;
    if (p.weight) badges += `<span class="badge bg-light text-dark border me-1">⚖️ ${p.weight}г</span>`;
    if (p.calories) badges += `<span class="badge bg-light text-dark border">🔥 ${p.calories} ккал</span>`;

    const shopName = p.shop ? p.shop.name : '<span class="text-muted fst-italic">Без магазина</span>';
    
    // Экранируем кавычки для JSON в data-атрибутах
    const productJson = JSON.stringify(p).replace(/"/g, '&quot;');
    const historyJson = JSON.stringify(p.history || []).replace(/"/g, '&quot;');

    return `
    <div class="card mb-2 p-3 border-0 shadow-sm">
        <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
                <h5 class="m-0">${p.name}</h5>
                <div class="mb-1">${badges}</div>
                <small class="text-muted">${shopName} • ${formatDate(p.updated_at)}</small>
            </div>
            <div class="text-end ps-3">
                <div class="fw-bold fs-5 text-success mb-1">${formatCurrency(p.price)}</div>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-secondary btn-history" 
                        title="История цен" 
                        data-name="${p.name}" 
                        data-history="${historyJson}">
                        <i class="bi bi-clock-history"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary btn-edit" data-product="${productJson}">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

export function ShopItem(s) {
    return `
    <li class="list-group-item d-flex justify-content-between align-items-center">
        ${s.name}
        <button class="btn btn-sm btn-danger btn-delete-shop" data-id="${s.id}">&times;</button>
    </li>`;
}

export function ShopOption(s) {
    return `<option value="${s.id}">${s.name}</option>`;
}

export function ShoppingListCard(list) {
    const date = new Date(list.created_at).toLocaleDateString();
    return `
    <div class="col-md-6 mb-3">
        <div class="card h-100 shadow-sm list-card cursor-pointer" data-id="${list.id}">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="card-title mb-1">${list.name}</h5>
                    <small class="text-muted">Создан: ${date}</small>
                </div>
                <button class="btn btn-outline-danger btn-sm btn-delete-list" data-id="${list.id}">&times;</button>
            </div>
        </div>
    </div>`;
}

export function ShoppingListItemRow(item) {
    // Защита, если продукт был удален
    if (!item.product) return ''; 

    const p = item.product;
    const shopName = p.shop ? p.shop.name : '???';
    const checked = item.is_bought ? 'checked' : '';
    const strike = item.is_bought ? 'text-decoration-line-through text-muted' : '';
    const total = (p.price * item.quantity).toFixed(2);

    return `
    <li class="list-group-item d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-3">
            <input class="form-check-input check-item" type="checkbox" data-id="${item.id}" ${checked} style="cursor:pointer; width: 1.3em; height: 1.3em;">
            <div class="${strike}">
                <div class="fw-bold">${p.name} <span class="badge bg-secondary rounded-pill ms-1">x${item.quantity}</span></div>
                <small class="text-muted">${shopName} • ${formatCurrency(p.price)}/шт</small>
            </div>
        </div>
        <div class="d-flex align-items-center gap-3">
            <span class="fw-bold ${strike}">${total} €</span>
            <button class="btn btn-sm btn-light text-danger btn-remove-item" data-id="${item.id}">&times;</button>
        </div>
    </li>`;
}

export function ProductSearchItem(p) {
    const shopName = p.shop ? p.shop.name : 'Без магазина';
    return `
    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
        <div>
            <strong>${p.name}</strong>
            <br><small class="text-muted">${shopName}</small>
        </div>
        <div class="text-end">
            <div class="fw-bold text-success">${formatCurrency(p.price)}</div>
            <button class="btn btn-sm btn-primary btn-add-to-list" data-product="${p.id}">
                + В список
            </button>
        </div>
    </div>`;
}
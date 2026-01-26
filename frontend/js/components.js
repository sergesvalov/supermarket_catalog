import { formatCurrency, formatDate } from './utils.js';

export function ProductCard(p) {
    let badges = '';
    if (p.quantity) badges += `<span class="badge bg-light text-dark border me-1">📦 ${p.quantity} шт</span>`;
    if (p.weight) badges += `<span class="badge bg-light text-dark border me-1">⚖️ ${p.weight}г</span>`;
    if (p.calories) badges += `<span class="badge bg-light text-dark border">🔥 ${p.calories} ккал</span>`;

    const shopName = p.shop ? p.shop.name : '<span class="text-muted fst-italic">Без магазина</span>';

    // В кнопку редактирования зашиваем JSON с данными через data-product
    // Это безопаснее и чище, чем передавать параметры в функцию
    const productJson = JSON.stringify(p).replace(/"/g, '&quot;');

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
                <button class="btn btn-sm btn-outline-primary btn-edit" data-product="${productJson}">
                    <i class="bi bi-pencil-fill"></i>
                </button>
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
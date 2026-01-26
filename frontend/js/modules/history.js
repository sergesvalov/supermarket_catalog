// Инициализируем Bootstrap Modal
const historyModalEl = document.getElementById('historyModal');
// Проверка на случай если модалки нет в HTML
let historyModal = historyModalEl ? new bootstrap.Modal(historyModalEl) : null;

const els = {
    name: document.getElementById('historyProductName'),
    list: document.getElementById('historyList')
};

export function showHistoryModal(name, history) {
    if (!historyModal) return;

    els.name.innerText = name;
    
    // Копия массива для сортировки
    const sortedHistory = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (sortedHistory.length === 0) {
        els.list.innerHTML = '<li class="list-group-item text-muted">Нет данных об изменениях</li>';
    } else {
        els.list.innerHTML = sortedHistory.map(h => {
            const date = new Date(h.created_at).toLocaleString();
            return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${date}</span>
                <span class="fw-bold text-success">${parseFloat(h.price).toFixed(2)} €</span>
            </li>`;
        }).join('');
    }
    
    historyModal.show();
}
import { api } from '../api.js';
import { ShoppingListCard, ShoppingListItemRow, ProductSearchItem } from '../components.js';
import { state } from '../state.js';

const els = {
    // ... поиск элементов перенесен внутрь функций ...
};

export function renderLists(lists) {
    const container = document.getElementById('listsContainer');
    if (!container) return;
    if (lists.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5">Нет списков. Создайте первый!</div>';
    } else {
        container.innerHTML = lists.map(ShoppingListCard).join('');
    }
}

export function initLists(refreshCallback) {
    const form = document.getElementById('newListForm');
    const container = document.getElementById('listsContainer');
    const backBtn = document.getElementById('backToListsBtn');
    const searchInput = document.getElementById('productSearchInput');
    const searchResults = document.getElementById('searchResults');
    const itemsList = document.getElementById('activeListItems');
    const btnSendTg = document.getElementById('btnSendTg'); // <--- КНОПКА ОТПРАВКИ

    // 1. Создание списка
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputName = document.getElementById('newListName');
            const name = inputName.value.trim();
            if(!name) return;
            try {
                await api.lists.create(name);
                inputName.value = '';
                if (refreshCallback) refreshCallback();
            } catch (err) { alert(err.message); }
        });
    }

    // 2. Открытие/Удаление
    if (container) {
        container.addEventListener('click', async (e) => {
            const delBtn = e.target.closest('.btn-delete-list');
            if (delBtn) {
                e.stopPropagation();
                if(confirm('Удалить список?')) {
                    await api.lists.delete(delBtn.dataset.id);
                    if (refreshCallback) refreshCallback();
                }
                return;
            }
            const card = e.target.closest('.list-card');
            if (card) openShoppingList(card.dataset.id);
        });
    }

    // 3. Назад
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('activeListView').classList.add('d-none');
            document.getElementById('listsOverview').classList.remove('d-none');
            state.currentListId = null;
            if (refreshCallback) refreshCallback();
        });
    }
    
    // 4. Отправка в TELEGRAM
    if (btnSendTg) {
        btnSendTg.addEventListener('click', async () => {
            if (!state.currentListId) return;
            
            const originalText = btnSendTg.innerHTML;
            btnSendTg.disabled = true;
            btnSendTg.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Отправка...';
            
            try {
                await api.lists.sendToTelegram(state.currentListId);
                alert("✅ Список успешно отправлен!");
            } catch (err) {
                alert("Ошибка отправки: " + err.message);
            } finally {
                btnSendTg.disabled = false;
                btnSendTg.innerHTML = originalText;
            }
        });
    }

    // 5. Поиск
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderProductPicker(e.target.value));
    }

    // 6. Добавление товара
    if (searchResults) {
        searchResults.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-add-to-list');
            if (!btn) return;
            e.preventDefault();
            try {
                await api.lists.addItem(state.currentListId, btn.dataset.product, 1);
                await refreshActiveList();
            } catch (err) { alert(err.message); }
        });
    }

    // 7. Чекбокс/Удаление товара
    if (itemsList) {
        itemsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('check-item')) {
                await api.lists.toggleItem(e.target.dataset.id, e.target.checked);
                refreshActiveList();
            }
            const delBtn = e.target.closest('.btn-remove-item');
            if (delBtn) {
                await api.lists.deleteItem(delBtn.dataset.id);
                refreshActiveList();
            }
        });
    }
}

// Внутренние функции
async function openShoppingList(id) {
    state.currentListId = id;
    document.getElementById('listsOverview').classList.add('d-none');
    document.getElementById('activeListView').classList.remove('d-none');
    document.getElementById('productSearchInput').value = '';
    
    renderProductPicker();
    await refreshActiveList();
}

export async function refreshActiveList() {
    if(!state.currentListId) return;
    const title = document.getElementById('activeListTitle');
    const listEl = document.getElementById('activeListItems');
    const totalEl = document.getElementById('totalSum');

    try {
        const list = await api.lists.getOne(state.currentListId);
        title.innerText = list.name;
        
        const items = list.items || [];
        if (items.length === 0) {
            listEl.innerHTML = '<li class="list-group-item text-center text-muted py-4">Список пуст. Выберите товары слева.</li>';
            totalEl.innerText = '0.00 €';
        } else {
            listEl.innerHTML = items.map(ShoppingListItemRow).join('');
            const sum = items.reduce((acc, item) => {
                if (!item.product) return acc;
                return acc + (item.product.price * item.quantity);
            }, 0);
            totalEl.innerText = sum.toFixed(2) + ' €';
        }
    } catch(e) {
        listEl.innerHTML = `<div class="alert alert-danger">Ошибка: ${e.message}</div>`;
    }
}

export function renderProductPicker(query = '') {
    const resEl = document.getElementById('searchResults');
    if (!resEl) return;
    query = query.toLowerCase().trim();
    
    let filtered = state.allProducts.filter(p => p.name.toLowerCase().includes(query));
    filtered.sort((a, b) => a.price - b.price);

    if (filtered.length === 0) {
        resEl.innerHTML = '<div class="list-group-item text-muted">Ничего не найдено</div>';
    } else {
        resEl.innerHTML = filtered.map(ProductSearchItem).join('');
    }
}
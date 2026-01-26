import { api } from '../api.js';
import { ShoppingListCard, ShoppingListItemRow, ProductSearchItem } from '../components.js';
import { state } from '../state.js'; // Берем кеш товаров отсюда

const els = {
    container: document.getElementById('listsContainer'),
    form: document.getElementById('newListForm'),
    inputName: document.getElementById('newListName'),
    
    // Активный список
    overview: document.getElementById('listsOverview'),
    activeView: document.getElementById('activeListView'),
    title: document.getElementById('activeListTitle'),
    itemsList: document.getElementById('activeListItems'),
    totalSum: document.getElementById('totalSum'),
    backBtn: document.getElementById('backToListsBtn'),
    
    // Поиск
    searchInput: document.getElementById('productSearchInput'),
    searchResults: document.getElementById('searchResults'),
};

export function renderLists(lists) {
    if (!els.container) return;
    if (lists.length === 0) {
        els.container.innerHTML = '<div class="col-12 text-center text-muted py-5">Нет списков. Создайте первый!</div>';
    } else {
        els.container.innerHTML = lists.map(ShoppingListCard).join('');
    }
}

export function initLists(refreshCallback) {
    // 1. Создание списка
    if (els.form) {
        els.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = els.inputName.value.trim();
            if(!name) return;
            try {
                await api.lists.create(name);
                els.inputName.value = '';
                if (refreshCallback) refreshCallback();
            } catch (err) { alert(err.message); }
        });
    }

    // 2. Клик по списку (Открыть / Удалить)
    if (els.container) {
        els.container.addEventListener('click', async (e) => {
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

    // 3. Кнопка Назад
    if (els.backBtn) {
        els.backBtn.addEventListener('click', () => {
            els.activeView.classList.add('d-none');
            els.overview.classList.remove('d-none');
            state.currentListId = null;
            if (refreshCallback) refreshCallback();
        });
    }

    // 4. Поиск (Input)
    if (els.searchInput) {
        els.searchInput.addEventListener('input', (e) => renderProductPicker(e.target.value));
    }

    // 5. Добавление товара (Клик по результату поиска)
    if (els.searchResults) {
        els.searchResults.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-add-to-list');
            if (!btn) return;
            e.preventDefault();
            try {
                await api.lists.addItem(state.currentListId, btn.dataset.product, 1);
                await refreshActiveList();
            } catch (err) { alert(err.message); }
        });
    }

    // 6. Управление пунктами (Чекбокс / Удаление)
    if (els.itemsList) {
        els.itemsList.addEventListener('click', async (e) => {
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

// === Внутренние функции модуля ===

async function openShoppingList(id) {
    state.currentListId = id;
    els.overview.classList.add('d-none');
    els.activeView.classList.remove('d-none');
    els.searchInput.value = '';
    
    renderProductPicker();
    await refreshActiveList();
}

// Экспортируем, чтобы App мог вызвать обновление, если мы уже внутри списка
export async function refreshActiveList() {
    if(!state.currentListId) return;
    try {
        const list = await api.lists.getOne(state.currentListId);
        els.title.innerText = list.name;
        
        const items = list.items || [];
        if (items.length === 0) {
            els.itemsList.innerHTML = '<li class="list-group-item text-center text-muted py-4">Список пуст. Выберите товары слева.</li>';
            els.totalSum.innerText = '0.00 €';
        } else {
            els.itemsList.innerHTML = items.map(ShoppingListItemRow).join('');
            const sum = items.reduce((acc, item) => {
                if (!item.product) return acc;
                return acc + (item.product.price * item.quantity);
            }, 0);
            els.totalSum.innerText = sum.toFixed(2) + ' €';
        }
    } catch(e) {
        console.error(e);
        els.itemsList.innerHTML = `<div class="alert alert-danger">Ошибка: ${e.message}</div>`;
    }
}

export function renderProductPicker(query = '') {
    if (!els.searchResults) return;
    query = query.toLowerCase().trim();
    
    // Используем state.allProducts, который был загружен в App.js
    let filtered = state.allProducts.filter(p => p.name.toLowerCase().includes(query));
    filtered.sort((a, b) => a.price - b.price);

    if (filtered.length === 0) {
        els.searchResults.innerHTML = '<div class="list-group-item text-muted">Ничего не найдено</div>';
    } else {
        els.searchResults.innerHTML = filtered.map(ProductSearchItem).join('');
    }
}
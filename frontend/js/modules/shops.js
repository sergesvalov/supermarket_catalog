import { api } from '../api.js';
import { ShopItem, ShopOption } from '../components.js';

// Удаляем глобальный объект els, так как он создавался слишком рано.
// Ищем элементы внутри функций.

export function renderShops(shops) {
    const select = document.getElementById('shopSelect');
    const list = document.getElementById('shopList');

    // Обновляем Select в форме товара
    if (select) {
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Не выбрано --</option>' + shops.map(ShopOption).join('');
        select.value = currentVal;
    }
    // Обновляем список во вкладке Магазины
    if (list) {
        list.innerHTML = shops.map(ShopItem).join('');
    }
}

export function initShops(refreshCallback) {
    const form = document.getElementById('shopForm');
    const list = document.getElementById('shopList');
    
    // 1. Создание магазина
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputName = document.getElementById('newShopName'); // Ищем инпут прямо в момент отправки
            
            if (!inputName || !inputName.value.trim()) return;

            try {
                await api.shops.create({ name: inputName.value });
                inputName.value = '';
                if (refreshCallback) refreshCallback();
            } catch (err) { 
                alert(err.message); 
            }
        });
    }

    // 2. Удаление магазина
    if (list) {
        list.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-delete-shop');
            if (!btn) return;
            
            if (confirm('Удалить магазин?')) {
                try {
                    await api.shops.delete(btn.dataset.id);
                    if (refreshCallback) refreshCallback();
                } catch (err) {
                    alert(err.message);
                }
            }
        });
    }
}
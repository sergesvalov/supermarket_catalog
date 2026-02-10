import { api } from '../api.js';
import { setCurrency } from '../utils.js';

let formEl, currencySelect;

export async function initAdmin() {
    formEl = document.getElementById('adminConfigForm');
    currencySelect = document.getElementById('currencySelect');

    if (!formEl) return;

    // Загрузка текущих настроек
    try {
        const config = await api.admin.getConfig();
        if (config && config.currency) {
            currencySelect.value = config.currency;
            setCurrency(getCurrencySymbol(config.currency));
        }
    } catch (e) {
        console.error("Failed to load admin config:", e);
    }

    // Сохранение настроек
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedCurrency = currencySelect.value;

        try {
            await api.admin.saveConfig(selectedCurrency);
            setCurrency(getCurrencySymbol(selectedCurrency));
            alert('Настройки сохранены! Перезагрузите страницу для обновления цен.');
            window.location.reload();
        } catch (err) {
            alert('Ошибка сохранения: ' + err.message);
        }
    });
}

function getCurrencySymbol(code) {
    const symbols = {
        'EUR': '€',
        'USD': '$',
        'RUB': '₽'
    };
    return symbols[code] || code;
}

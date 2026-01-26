export function formatCurrency(value) {
    return parseFloat(value).toFixed(2) + ' €';
}

export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

export function validatePositive(...values) {
    return values.every(v => v === null || v === '' || isNaN(v) || parseFloat(v) >= 0);
}

export function parseOptionalFloat(value) {
    return value ? parseFloat(value) : null;
}

export function parseOptionalInt(value) {
    return value ? parseInt(value) : null;
}
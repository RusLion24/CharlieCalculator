/* Дрібні чисті хелпери. Підключається першим — від нього залежать усі інші модулі. */

window.Calc = window.Calc || {};

Calc.utils = (function () {
    'use strict';

    var HTML_ESCAPES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    /**
     * Назви позицій і кошторисів потрапляють у розмітку через innerHTML, а база
     * може прийти з імпортованого JSON — тобто це недовірене джерело.
     */
    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/[&<>"']/g, function (char) {
            return HTML_ESCAPES[char];
        });
    }

    function toNumber(value) {
        var num = parseFloat(value);
        return isFinite(num) ? num : 0;
    }

    function formatMoney(value) {
        return toNumber(value).toFixed(2);
    }

    function formatQuantity(value) {
        return String(toNumber(value));
    }

    function formatDateTime(date) {
        return (date || new Date()).toLocaleString('uk-UA');
    }

    function formatDate(date) {
        return (date || new Date()).toLocaleDateString('uk-UA');
    }

    /** Дата для імені файлу: сортується за алфавітом і не містить крапок. */
    function formatDateIso(date) {
        var value = date || new Date();
        var month = String(value.getMonth() + 1);
        var day = String(value.getDate());

        return value.getFullYear() + '-' +
            (month.length < 2 ? '0' + month : month) + '-' +
            (day.length < 2 ? '0' + day : day);
    }

    /** Прибирає символи, недопустимі в іменах файлів на Windows/macOS/Linux. */
    function sanitizeFileName(name) {
        return String(name || 'Кошторис')
            .replace(/[\\/:*?"<>|]+/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120) || 'Кошторис';
    }

    function byId(id) {
        return document.getElementById(id);
    }

    return {
        escapeHtml: escapeHtml,
        toNumber: toNumber,
        formatMoney: formatMoney,
        formatQuantity: formatQuantity,
        formatDateTime: formatDateTime,
        formatDate: formatDate,
        formatDateIso: formatDateIso,
        sanitizeFileName: sanitizeFileName,
        byId: byId
    };
})();

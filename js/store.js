/* Єдине джерело істини: база прайсів у localStorage + стан поточного кошторису в пам'яті. */

window.Calc = window.Calc || {};

Calc.store = (function () {
    'use strict';

    var utils = Calc.utils;
    var STORAGE_KEY = Calc.config.STORAGE_KEY;

    var data = read();

    /* Стан поточного кошторису. Навмисно не потрапляє в localStorage: правка ціни
       діє лише на цей кошторис і не змінює базу. */
    var quantities = {};
    var priceOverrides = {};
    var comments = {};
    var editingId = null;

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function text(value) {
        return value === null || value === undefined ? '' : String(value);
    }

    /** Ціна є лише в робіт: матеріали — це перелік без грошей. */
    function normalizeItems(list, type) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(function (item) {
                return item && typeof item === 'object';
            })
            .map(function (item, index) {
                var id = parseInt(item.id, 10);
                var normalized = {
                    id: isFinite(id) ? id : index + 1,
                    cat: text(item.cat),
                    name: text(item.name),
                    unit: text(item.unit)
                };

                if (type === 'job') normalized.price = utils.toNumber(item.price);
                return normalized;
            });
    }

    function normalizeEstimates(list) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(function (est) {
                return est && typeof est === 'object';
            })
            .map(function (est, index) {
                var items = Array.isArray(est.items) ? est.items : [];
                return {
                    id: utils.toNumber(est.id) || index + 1,
                    date: String(est.date || ''),
                    name: String(est.name || ''),
                    jobsTotal: utils.toNumber(est.jobsTotal),
                    materialsTotal: utils.toNumber(est.materialsTotal),
                    grandTotal: utils.toNumber(est.grandTotal),
                    items: items.map(function (item) {
                        var refId = parseInt(item.refId, 10);
                        return {
                            type: item.type === 'material' ? 'material' : 'job',
                            refId: isFinite(refId) ? refId : null,
                            name: text(item.name),
                            cat: text(item.cat),
                            unit: text(item.unit),
                            price: utils.toNumber(item.price),
                            qty: utils.toNumber(item.qty),
                            comment: text(item.comment)
                        };
                    })
                };
            });
    }

    /** Приводить будь-який вхід (localStorage або імпортований файл) до очікуваної форми. */
    function normalize(raw) {
        if (!raw || typeof raw !== 'object') return null;
        if (!Array.isArray(raw.categories) || !Array.isArray(raw.jobs) || !Array.isArray(raw.materials)) {
            return null;
        }
        return {
            categories: raw.categories.map(String),
            jobs: normalizeItems(raw.jobs, 'job'),
            materials: normalizeItems(raw.materials, 'material'),
            estimates: normalizeEstimates(raw.estimates)
        };
    }

    function read() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return clone(Calc.config.DEFAULT_DATA);
            return normalize(JSON.parse(raw)) || clone(Calc.config.DEFAULT_DATA);
        } catch (error) {
            console.warn('Не вдалося прочитати збережену базу, застосовано типову.', error);
            return clone(Calc.config.DEFAULT_DATA);
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Не вдалося зберегти базу.', error);
            alert('Не вдалося зберегти дані: сховище браузера переповнене або недоступне.');
            return false;
        }
    }

    function get() {
        return data;
    }

    /** Замінює всю базу (використовується імпортом). Повертає false на некоректних даних. */
    function replace(raw) {
        var next = normalize(raw);
        if (!next) return false;
        data = next;
        save();
        return true;
    }

    function items(type) {
        return type === 'job' ? data.jobs : data.materials;
    }

    function setItems(type, list) {
        if (type === 'job') {
            data.jobs = list;
        } else {
            data.materials = list;
        }
    }

    function findItem(type, id) {
        var numericId = utils.toNumber(id);
        return items(type).filter(function (item) {
            return item.id === numericId;
        })[0] || null;
    }

    function qtyKey(type, id) {
        return type + '_' + id;
    }

    function getQty(type, id) {
        return quantities[qtyKey(type, id)] || 0;
    }

    function setQty(type, id, value) {
        quantities[qtyKey(type, id)] = utils.toNumber(value);
    }

    function hasPriceOverride(type, id) {
        return Object.prototype.hasOwnProperty.call(priceOverrides, qtyKey(type, id));
    }

    function getPriceOverride(type, id) {
        return priceOverrides[qtyKey(type, id)];
    }

    function setPriceOverride(type, id, value) {
        priceOverrides[qtyKey(type, id)] = utils.toNumber(value);
    }

    function clearPriceOverride(type, id) {
        delete priceOverrides[qtyKey(type, id)];
    }

    function getComment(type, id) {
        return comments[qtyKey(type, id)] || '';
    }

    function setComment(type, id, value) {
        comments[qtyKey(type, id)] = text(value);
    }

    function getEditing() {
        return editingId;
    }

    function setEditing(id) {
        editingId = id === null || id === undefined ? null : utils.toNumber(id);
    }

    /** Скидає весь поточний кошторис: обсяги, правки цін, коментарі, режим редагування. */
    function resetCurrent() {
        quantities = {};
        priceOverrides = {};
        comments = {};
        editingId = null;
    }

    return {
        get: get,
        replace: replace,
        save: save,
        items: items,
        setItems: setItems,
        findItem: findItem,
        qtyKey: qtyKey,
        getQty: getQty,
        setQty: setQty,
        hasPriceOverride: hasPriceOverride,
        getPriceOverride: getPriceOverride,
        setPriceOverride: setPriceOverride,
        clearPriceOverride: clearPriceOverride,
        getComment: getComment,
        setComment: setComment,
        getEditing: getEditing,
        setEditing: setEditing,
        resetCurrent: resetCurrent
    };
})();

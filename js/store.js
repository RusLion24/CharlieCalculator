/* Єдине джерело істини: база прайсів у localStorage + обсяги поточного кошторису в пам'яті. */

window.Calc = window.Calc || {};

Calc.store = (function () {
    'use strict';

    var utils = Calc.utils;
    var STORAGE_KEY = Calc.config.STORAGE_KEY;

    var data = read();
    var quantities = {};

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeItems(list) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(function (item) {
                return item && typeof item === 'object';
            })
            .map(function (item, index) {
                var id = parseInt(item.id, 10);
                return {
                    id: isFinite(id) ? id : index + 1,
                    cat: item.cat === null || item.cat === undefined ? '' : String(item.cat),
                    name: item.name === null || item.name === undefined ? '' : String(item.name),
                    unit: item.unit === null || item.unit === undefined ? '' : String(item.unit),
                    price: utils.toNumber(item.price)
                };
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
                        return {
                            type: item.type === 'material' ? 'material' : 'job',
                            name: String(item.name || ''),
                            cat: String(item.cat || ''),
                            unit: String(item.unit || ''),
                            price: utils.toNumber(item.price),
                            qty: utils.toNumber(item.qty)
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
            jobs: normalizeItems(raw.jobs),
            materials: normalizeItems(raw.materials),
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

    function clearQty() {
        quantities = {};
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
        clearQty: clearQty
    };
})();

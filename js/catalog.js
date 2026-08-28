/* Операції над базою прайсів: категорії, позиції, порядок рядків.
   Модуль не читає DOM — усі дані приходять аргументами. */

window.Calc = window.Calc || {};

Calc.catalog = (function () {
    'use strict';

    var store = Calc.store;
    var utils = Calc.utils;

    function categories() {
        return store.get().categories;
    }

    function addCategory(name) {
        var trimmed = String(name || '').trim();
        if (!trimmed) return { ok: false, error: 'Вкажіть назву категорії' };
        if (categories().indexOf(trimmed) !== -1) {
            return { ok: false, error: 'Категорія вже існує' };
        }
        categories().push(trimmed);
        store.save();
        return { ok: true };
    }

    function renameCategory(index, newName) {
        var list = categories();
        var oldName = list[index];
        var trimmed = String(newName || '').trim();

        if (oldName === undefined) return { ok: false, error: 'Категорію не знайдено' };
        if (!trimmed || trimmed === oldName) return { ok: false };
        if (list.indexOf(trimmed) !== -1) {
            return { ok: false, error: 'Категорія з такою назвою вже існує' };
        }

        list[index] = trimmed;

        // Категорія прив'язана рядком, тому перейменування треба протягнути по позиціях.
        ['job', 'material'].forEach(function (type) {
            store.items(type).forEach(function (item) {
                if (item.cat === oldName) item.cat = trimmed;
            });
        });

        store.save();
        return { ok: true };
    }

    function removeCategory(index) {
        var list = categories();
        var name = list[index];
        if (name === undefined) return { ok: false, error: 'Категорію не знайдено' };

        list.splice(index, 1);

        ['job', 'material'].forEach(function (type) {
            store.items(type).forEach(function (item) {
                if (item.cat === name) item.cat = '';
            });
        });

        store.save();
        return { ok: true, name: name };
    }

    function nextId(type) {
        var list = store.items(type);
        return list.reduce(function (max, item) {
            return Math.max(max, item.id);
        }, 0) + 1;
    }

    function addItem(type, fields) {
        var name = String(fields.name || '').trim();
        var unit = String(fields.unit || '').trim();
        var price = parseFloat(fields.price);

        if (!name || !unit || !isFinite(price)) {
            return { ok: false, error: 'Заповніть всі поля коректно' };
        }

        store.items(type).push({
            id: nextId(type),
            cat: String(fields.cat || ''),
            name: name,
            unit: unit,
            price: price
        });

        store.save();
        return { ok: true };
    }

    function updateItem(type, id, fields) {
        var item = store.findItem(type, id);
        if (!item) return { ok: false, error: 'Позицію не знайдено' };

        if (fields.name !== undefined) item.name = String(fields.name).trim() || item.name;
        if (fields.unit !== undefined) item.unit = String(fields.unit).trim() || item.unit;
        if (fields.cat !== undefined) item.cat = String(fields.cat);
        if (fields.price !== undefined) item.price = utils.toNumber(fields.price);

        store.save();
        return { ok: true };
    }

    function removeItem(type, id) {
        var numericId = utils.toNumber(id);
        var next = store.items(type).filter(function (item) {
            return item.id !== numericId;
        });
        store.setItems(type, next);
        store.save();
        return { ok: true };
    }

    function moveItem(type, index, direction) {
        var list = store.items(type);
        var target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= list.length) return { ok: false };

        var swap = list[index];
        list[index] = list[target];
        list[target] = swap;

        store.save();
        return { ok: true };
    }

    return {
        categories: categories,
        addCategory: addCategory,
        renameCategory: renameCategory,
        removeCategory: removeCategory,
        addItem: addItem,
        updateItem: updateItem,
        removeItem: removeItem,
        moveItem: moveItem
    };
})();

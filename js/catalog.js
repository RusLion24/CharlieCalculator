/* Операції над базою прайсів: позиції та порядок рядків.
   Модуль не читає DOM — усі дані приходять аргументами. */

window.Calc = window.Calc || {};

Calc.catalog = (function () {
    'use strict';

    var store = Calc.store;
    var utils = Calc.utils;

    function nextId(type) {
        var list = store.items(type);
        return list.reduce(function (max, item) {
            return Math.max(max, item.id);
        }, 0) + 1;
    }

    /** Ціна стосується лише робіт: матеріали зберігаються як перелік без грошей. */
    function addItem(type, fields) {
        var name = String(fields.name || '').trim();
        var unit = String(fields.unit || '').trim();
        var price = parseFloat(fields.price);

        if (!name || !unit) {
            return { ok: false, error: 'Заповніть всі поля коректно' };
        }

        if (type === 'job' && !isFinite(price)) {
            return { ok: false, error: 'Вкажіть ціну роботи числом' };
        }

        var item = {
            id: nextId(type),
            cat: '',
            name: name,
            unit: unit
        };

        if (type === 'job') item.price = price;

        store.items(type).push(item);
        store.save();
        return { ok: true };
    }

    function updateItem(type, id, fields) {
        var item = store.findItem(type, id);
        if (!item) return { ok: false, error: 'Позицію не знайдено' };

        if (fields.name !== undefined) item.name = String(fields.name).trim() || item.name;
        if (fields.unit !== undefined) item.unit = String(fields.unit).trim() || item.unit;
        if (type === 'job' && fields.price !== undefined) item.price = utils.toNumber(fields.price);

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
        addItem: addItem,
        updateItem: updateItem,
        removeItem: removeItem,
        moveItem: moveItem
    };
})();

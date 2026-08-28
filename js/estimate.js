/* Підрахунки поточного кошторису і робота з архівом. */

window.Calc = window.Calc || {};

Calc.estimate = (function () {
    'use strict';

    var store = Calc.store;
    var utils = Calc.utils;

    var TYPES = ['job', 'material'];

    /**
     * Ціна, за якою рахують саме цей кошторис: правка користувача, якщо вона є,
     * інакше ціна з бази. Матеріали грошей не мають.
     */
    function priceOf(type, id) {
        if (type !== 'job') return 0;
        if (store.hasPriceOverride(type, id)) return store.getPriceOverride(type, id);

        var item = store.findItem(type, id);
        return item ? utils.toNumber(item.price) : 0;
    }

    function basePriceOf(type, id) {
        var item = store.findItem(type, id);
        return item && type === 'job' ? utils.toNumber(item.price) : 0;
    }

    /** Чи відрізняється ціна рядка від бази — від цього залежить підсвітка в інтерфейсі. */
    function isPriceEdited(type, id) {
        if (type !== 'job' || !store.hasPriceOverride(type, id)) return false;
        return priceOf(type, id) !== basePriceOf(type, id);
    }

    /** Позиції з введеним обсягом > 0, з уже порахованою сумою рядка. */
    function selectedLines(type) {
        return store.items(type)
            .map(function (item) {
                var qty = store.getQty(type, item.id);
                var price = priceOf(type, item.id);

                return {
                    type: type,
                    refId: item.id,
                    name: item.name,
                    cat: item.cat,
                    unit: item.unit,
                    price: price,
                    qty: qty,
                    total: qty * price,
                    comment: type === 'material' ? store.getComment(type, item.id) : ''
                };
            })
            .filter(function (line) {
                return line.qty > 0;
            });
    }

    function sum(lines) {
        return lines.reduce(function (acc, line) {
            return acc + line.total;
        }, 0);
    }

    function totals() {
        var jobsTotal = 0;

        store.items('job').forEach(function (item) {
            jobsTotal += store.getQty('job', item.id) * priceOf('job', item.id);
        });

        return {
            jobsTotal: jobsTotal,
            grandTotal: jobsTotal
        };
    }

    function lineTotal(type, id) {
        return store.getQty(type, id) * priceOf(type, id);
    }

    function toRecordItem(line) {
        return {
            type: line.type,
            refId: line.refId,
            name: line.name,
            cat: line.cat,
            unit: line.unit,
            price: line.price,
            qty: line.qty,
            comment: line.comment
        };
    }

    /**
     * Зберігає поточний кошторис. У режимі редагування перезаписує той самий запис
     * архіву, лишаючи його id і оновлюючи дату.
     */
    function saveToArchive(name) {
        var jobs = selectedLines('job');
        var materials = selectedLines('material');

        if (jobs.length === 0 && materials.length === 0) {
            return { ok: false, error: 'Немає введених обсягів для збереження кошторису!' };
        }

        var jobsTotal = sum(jobs);
        var target = findArchived(store.getEditing());

        var record = {
            id: target ? target.id : Date.now(),
            date: utils.formatDateTime(),
            name: String(name || '').trim() || 'Кошторис без назви',
            jobsTotal: jobsTotal,
            materialsTotal: 0,
            grandTotal: jobsTotal,
            items: jobs.concat(materials).map(toRecordItem)
        };

        var list = store.get().estimates;

        if (target) {
            list[list.indexOf(target)] = record;
        } else {
            list.push(record);
        }

        store.save();
        return { ok: true, updated: !!target };
    }

    /** Позиція бази, якій відповідає рядок архіву: спершу за id, потім за назвою. */
    function resolveItem(type, recordItem) {
        var byId = recordItem.refId === null ? null : store.findItem(type, recordItem.refId);
        if (byId) return byId;

        var list = store.items(type);

        var exact = list.filter(function (item) {
            return item.name === recordItem.name &&
                item.cat === recordItem.cat &&
                item.unit === recordItem.unit;
        })[0];

        if (exact) return exact;

        return list.filter(function (item) {
            return item.name === recordItem.name;
        })[0] || null;
    }

    /**
     * Переносить архівний кошторис у калькулятор. Обсяги привʼязані до позицій бази,
     * тому рядки, яких у базі вже немає, перенести неможливо — повертаємо їх окремо.
     */
    function loadForEdit(id) {
        var est = findArchived(id);
        if (!est) return { ok: false, error: 'Кошторис не знайдено' };

        store.resetCurrent();

        var missing = [];

        est.items.forEach(function (recordItem) {
            var type = recordItem.type === 'material' ? 'material' : 'job';
            var item = resolveItem(type, recordItem);

            if (!item) {
                missing.push(recordItem.name);
                return;
            }

            store.setQty(type, item.id, recordItem.qty);

            if (type === 'job') {
                if (utils.toNumber(recordItem.price) !== utils.toNumber(item.price)) {
                    store.setPriceOverride(type, item.id, recordItem.price);
                }
            } else if (recordItem.comment) {
                store.setComment(type, item.id, recordItem.comment);
            }
        });

        store.setEditing(est.id);

        return { ok: true, name: est.name, date: est.date, missing: missing };
    }

    function editing() {
        return findArchived(store.getEditing());
    }

    function exitEdit() {
        store.resetCurrent();
        return { ok: true };
    }

    function archived() {
        return store.get().estimates;
    }

    function findArchived(id) {
        if (id === null || id === undefined) return null;

        var numericId = utils.toNumber(id);
        return archived().filter(function (est) {
            return est.id === numericId;
        })[0] || null;
    }

    function removeArchived(id) {
        var numericId = utils.toNumber(id);

        store.get().estimates = archived().filter(function (est) {
            return est.id !== numericId;
        });

        if (store.getEditing() === numericId) store.resetCurrent();

        store.save();
        return { ok: true };
    }

    return {
        TYPES: TYPES,
        priceOf: priceOf,
        basePriceOf: basePriceOf,
        isPriceEdited: isPriceEdited,
        selectedLines: selectedLines,
        totals: totals,
        lineTotal: lineTotal,
        saveToArchive: saveToArchive,
        loadForEdit: loadForEdit,
        editing: editing,
        exitEdit: exitEdit,
        archived: archived,
        findArchived: findArchived,
        removeArchived: removeArchived
    };
})();

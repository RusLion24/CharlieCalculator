/* Підрахунки поточного кошторису і робота з архівом. */

window.Calc = window.Calc || {};

Calc.estimate = (function () {
    'use strict';

    var store = Calc.store;
    var utils = Calc.utils;

    var TYPES = ['job', 'material'];

    /** Позиції з введеним обсягом > 0, з уже порахованою сумою рядка. */
    function selectedLines(type) {
        return store.items(type)
            .map(function (item) {
                var qty = store.getQty(type, item.id);
                return {
                    type: type,
                    name: item.name,
                    cat: item.cat,
                    unit: item.unit,
                    price: item.price,
                    qty: qty,
                    total: qty * item.price
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
        var materialsTotal = 0;

        store.items('job').forEach(function (item) {
            jobsTotal += store.getQty('job', item.id) * item.price;
        });

        store.items('material').forEach(function (item) {
            materialsTotal += store.getQty('material', item.id) * item.price;
        });

        return {
            jobsTotal: jobsTotal,
            materialsTotal: materialsTotal,
            grandTotal: jobsTotal + materialsTotal
        };
    }

    function lineTotal(type, id) {
        var item = store.findItem(type, id);
        if (!item) return 0;
        return store.getQty(type, id) * item.price;
    }

    function saveToArchive(name) {
        var jobs = selectedLines('job');
        var materials = selectedLines('material');

        if (jobs.length === 0 && materials.length === 0) {
            return { ok: false, error: 'Немає введених обсягів для збереження кошторису!' };
        }

        var jobsTotal = sum(jobs);
        var materialsTotal = sum(materials);

        store.get().estimates.push({
            id: Date.now(),
            date: utils.formatDateTime(),
            name: String(name || '').trim() || 'Кошторис без назви',
            jobsTotal: jobsTotal,
            materialsTotal: materialsTotal,
            grandTotal: jobsTotal + materialsTotal,
            items: jobs.concat(materials).map(function (line) {
                return {
                    type: line.type,
                    name: line.name,
                    cat: line.cat,
                    unit: line.unit,
                    price: line.price,
                    qty: line.qty
                };
            })
        });

        store.save();
        return { ok: true };
    }

    function archived() {
        return store.get().estimates;
    }

    function findArchived(id) {
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
        store.save();
        return { ok: true };
    }

    return {
        TYPES: TYPES,
        selectedLines: selectedLines,
        totals: totals,
        lineTotal: lineTotal,
        saveToArchive: saveToArchive,
        archived: archived,
        findArchived: findArchived,
        removeArchived: removeArchived
    };
})();

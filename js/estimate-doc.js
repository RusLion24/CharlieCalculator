/* Спільна модель документа кошторису.
   Одна форма даних для трьох споживачів (перегляд, друк, PDF) і двох джерел
   (поточний кошторис та архівний запис) — щоб не дублювати побудову таблиць. */

window.Calc = window.Calc || {};

Calc.estimateDoc = (function () {
    'use strict';

    var utils = Calc.utils;
    var estimate = Calc.estimate;

    function toLine(item) {
        var qty = utils.toNumber(item.qty);
        var price = utils.toNumber(item.price);
        return {
            name: item.name,
            cat: item.cat,
            unit: item.unit,
            price: price,
            qty: qty,
            total: qty * price
        };
    }

    function sum(lines) {
        return lines.reduce(function (acc, line) {
            return acc + line.total;
        }, 0);
    }

    function make(name, date, jobs, materials, knownTotals) {
        var jobsTotal = knownTotals ? knownTotals.jobsTotal : sum(jobs);
        var materialsTotal = knownTotals ? knownTotals.materialsTotal : sum(materials);

        return {
            name: name,
            date: date,
            jobs: jobs,
            materials: materials,
            jobsTotal: jobsTotal,
            materialsTotal: materialsTotal,
            grandTotal: knownTotals ? knownTotals.grandTotal : jobsTotal + materialsTotal,
            isEmpty: jobs.length === 0 && materials.length === 0
        };
    }

    function buildFromCurrent(name) {
        return make(
            String(name || '').trim() || 'Кошторис без назви',
            utils.formatDateTime(),
            estimate.selectedLines('job').map(toLine),
            estimate.selectedLines('material').map(toLine),
            null
        );
    }

    function buildFromArchive(id) {
        var est = estimate.findArchived(id);
        if (!est) return null;

        function linesOf(type) {
            return est.items
                .filter(function (item) {
                    return item.type === type;
                })
                .map(toLine);
        }

        return make(est.name, est.date, linesOf('job'), linesOf('material'), {
            jobsTotal: est.jobsTotal,
            materialsTotal: est.materialsTotal,
            grandTotal: est.grandTotal
        });
    }

    /** Секції у порядку, в якому їх показують усі споживачі. */
    function sections(doc) {
        return [
            { title: 'Роботи', lines: doc.jobs, total: doc.jobsTotal, totalLabel: 'Всього роботи:' },
            { title: 'Матеріали', lines: doc.materials, total: doc.materialsTotal, totalLabel: 'Всього матеріали:' }
        ].filter(function (section) {
            return section.lines.length > 0;
        });
    }

    return {
        buildFromCurrent: buildFromCurrent,
        buildFromArchive: buildFromArchive,
        sections: sections
    };
})();

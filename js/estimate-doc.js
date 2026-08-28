/* Спільна модель документа кошторису.
   Одна форма даних для трьох споживачів (перегляд, друк, PDF) і двох джерел
   (поточний кошторис та архівний запис) — щоб не дублювати побудову таблиць.

   Роботи мають ціну й суму, матеріали — лише обсяг і коментар. */

window.Calc = window.Calc || {};

Calc.estimateDoc = (function () {
    'use strict';

    var utils = Calc.utils;
    var estimate = Calc.estimate;

    function toJobLine(item) {
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

    function toMaterialLine(item) {
        return {
            name: item.name,
            cat: item.cat,
            unit: item.unit,
            qty: utils.toNumber(item.qty),
            comment: item.comment === null || item.comment === undefined ? '' : String(item.comment)
        };
    }

    function sum(lines) {
        return lines.reduce(function (acc, line) {
            return acc + line.total;
        }, 0);
    }

    function hasAnyComment(materials) {
        return materials.some(function (line) {
            return String(line.comment).trim() !== '';
        });
    }

    function make(name, date, jobs, materials) {
        var jobsTotal = sum(jobs);

        return {
            name: name,
            date: date,
            jobs: jobs,
            materials: materials,
            jobsTotal: jobsTotal,
            grandTotal: jobsTotal,
            hasComments: hasAnyComment(materials),
            isEmpty: jobs.length === 0 && materials.length === 0
        };
    }

    function buildFromCurrent(name) {
        return make(
            String(name || '').trim() || 'Кошторис без назви',
            utils.formatDateTime(),
            estimate.selectedLines('job').map(toJobLine),
            estimate.selectedLines('material').map(toMaterialLine)
        );
    }

    function buildFromArchive(id) {
        var est = estimate.findArchived(id);
        if (!est) return null;

        function itemsOf(type) {
            return est.items.filter(function (item) {
                return item.type === type;
            });
        }

        return make(
            est.name,
            est.date,
            itemsOf('job').map(toJobLine),
            itemsOf('material').map(toMaterialLine)
        );
    }

    /** Секції у порядку, в якому їх показують усі споживачі. */
    function sections(doc) {
        return [
            {
                title: 'Роботи',
                kind: 'job',
                lines: doc.jobs,
                total: doc.jobsTotal,
                totalLabel: 'Всього роботи:'
            },
            {
                title: 'Матеріали',
                kind: 'material',
                lines: doc.materials,
                showComment: doc.hasComments
            }
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

/* Обробники інтерфейсу та ініціалізація.
   Тут єдине місце, де код читає поля форм і показує prompt/confirm/alert. */

window.Calc = window.Calc || {};

Calc.app = (function () {
    'use strict';

    var utils = Calc.utils;
    var store = Calc.store;
    var catalog = Calc.catalog;
    var estimate = Calc.estimate;
    var estimateDoc = Calc.estimateDoc;
    var render = Calc.render;
    var preview = Calc.preview;

    function notifyError(result) {
        if (result && result.error) alert(result.error);
        return result && result.ok;
    }

    function switchTab(event, tabId) {
        document.querySelectorAll('.tab-pane').forEach(function (pane) {
            pane.classList.remove('active');
        });
        document.querySelectorAll('.tab-link').forEach(function (link) {
            link.classList.remove('active');
        });

        var pane = utils.byId(tabId);
        if (pane) pane.classList.add('active');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');

        render.all();
    }

    function updateQty(type, id, value) {
        store.setQty(type, id, value);
        render.lineTotal(type, id);
        render.totals();
    }

    function addCategory() {
        var input = utils.byId('newCatName');
        if (!notifyError(catalog.addCategory(input.value))) return;

        input.value = '';
        render.all();
    }

    function editCategory(index) {
        var current = catalog.categories()[index];
        if (current === undefined) return;

        var next = prompt('Редагувати назву категорії:', current);
        if (next === null) return;

        var result = catalog.renameCategory(index, next);
        if (result.error) alert(result.error);
        if (result.ok) render.all();
    }

    function deleteCategory(index) {
        var name = catalog.categories()[index];
        if (name === undefined) return;

        var message = 'Видалити категорію "' + name + '"? Всі пов\'язані елементи залишаться, але втратять категорію.';
        if (!confirm(message)) return;

        if (notifyError(catalog.removeCategory(index))) render.all();
    }

    function addNewItem() {
        var type = utils.byId('newItemType').value;
        var fields = {
            cat: utils.byId('newItemCat').value,
            name: utils.byId('newItemName').value,
            unit: utils.byId('newItemUnit').value,
            price: utils.byId('newItemPrice').value
        };

        if (!notifyError(catalog.addItem(type, fields))) return;

        utils.byId('newItemName').value = '';
        utils.byId('newItemUnit').value = '';
        utils.byId('newItemPrice').value = '';

        render.all();
    }

    function editItem(type, id) {
        var item = store.findItem(type, id);
        if (!item) return;

        var name = prompt('Нова назва:', item.name);
        if (name === null) return;

        var unit = prompt('Нова од. виміру:', item.unit);
        if (unit === null) return;

        var price = prompt('Нова ціна:', item.price);
        if (price === null) return;
        if (!isFinite(parseFloat(price))) return alert('Ціна має бути числом');

        if (notifyError(catalog.updateItem(type, id, { name: name, unit: unit, price: price }))) {
            render.all();
        }
    }

    function deleteItem(type, id) {
        if (!confirm('Видалити цей елемент з бази?')) return;
        catalog.removeItem(type, id);
        render.all();
    }

    function moveItemOrder(type, index, direction) {
        if (catalog.moveItem(type, index, direction).ok) {
            render.settingsTables();
        }
    }

    function currentName() {
        var input = utils.byId('estimateName');
        return input ? input.value : '';
    }

    function currentDoc() {
        return estimateDoc.buildFromCurrent(currentName());
    }

    function saveCurrentEstimate() {
        if (!notifyError(estimate.saveToArchive(currentName()))) return;
        render.all();
        alert('Кошторис збережено в архів!');
    }

    function openPreviewModal() {
        preview.open(currentDoc(), currentName());
    }

    function closePreviewModal() {
        preview.close();
    }

    function viewArchivedEstimate(id) {
        var model = estimateDoc.buildFromArchive(id);
        if (!model) return;
        preview.open(model, model.name + ' (Архів від ' + model.date + ')');
    }

    function deleteEstimate(id) {
        if (!confirm('Видалити цей кошторис з архіву?')) return;
        estimate.removeArchived(id);
        render.savedEstimates();
    }

    function printCurrentEstimate() {
        notifyError(Calc.exportPrint.print(currentDoc()));
    }

    function printArchivedEstimate(id) {
        notifyError(Calc.exportPrint.print(estimateDoc.buildFromArchive(id)));
    }

    function downloadCurrentPdf() {
        notifyError(Calc.exportPdf.save(currentDoc()));
    }

    function downloadArchivedPdf(id) {
        notifyError(Calc.exportPdf.save(estimateDoc.buildFromArchive(id)));
    }

    function exportDatabase() {
        Calc.exportJson.exportDatabase();
    }

    function importDatabase(event) {
        Calc.exportJson.importDatabase(event, render.all);
    }

    function init() {
        render.all();
    }

    return {
        init: init,
        switchTab: switchTab,
        updateQty: updateQty,
        addCategory: addCategory,
        editCategory: editCategory,
        deleteCategory: deleteCategory,
        addNewItem: addNewItem,
        editItem: editItem,
        deleteItem: deleteItem,
        moveItemOrder: moveItemOrder,
        saveCurrentEstimate: saveCurrentEstimate,
        openPreviewModal: openPreviewModal,
        closePreviewModal: closePreviewModal,
        viewArchivedEstimate: viewArchivedEstimate,
        deleteEstimate: deleteEstimate,
        printCurrentEstimate: printCurrentEstimate,
        printArchivedEstimate: printArchivedEstimate,
        downloadCurrentPdf: downloadCurrentPdf,
        downloadArchivedPdf: downloadArchivedPdf,
        exportDatabase: exportDatabase,
        importDatabase: importDatabase
    };
})();

/* Фасад для inline-обробників у розмітці: імена в HTML залишаються короткими,
   а вся логіка живе в Calc.app. */
(function (app) {
    'use strict';

    Object.keys(app).forEach(function (name) {
        if (name !== 'init') window[name] = app[name];
    });

    document.addEventListener('DOMContentLoaded', app.init);
})(Calc.app);

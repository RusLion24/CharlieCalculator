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

    function activateTab(tabId) {
        document.querySelectorAll('.tab-pane').forEach(function (pane) {
            pane.classList.toggle('active', pane.id === tabId);
        });
        document.querySelectorAll('.tab-link').forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
        });

        render.all();
    }

    function switchTab(tabId) {
        activateTab(tabId);
    }

    function updateQty(type, id, value) {
        store.setQty(type, id, value);
        render.lineTotal(type, id);
        render.totals();
    }

    /** Порожнє поле означає «як у базі», тому правку просто прибираємо. */
    function updateLinePrice(id, value) {
        if (String(value).trim() === '') {
            store.clearPriceOverride('job', id);
        } else {
            store.setPriceOverride('job', id, value);
        }

        render.linePriceState(id);
        render.lineTotal('job', id);
        render.totals();
    }

    function resetLinePrice(id) {
        store.clearPriceOverride('job', id);
        render.linePriceValue(id);
        render.linePriceState(id);
        render.lineTotal('job', id);
        render.totals();
    }

    function updateComment(id, value) {
        store.setComment('material', id, value);
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

    /** Ціна є лише в робіт, тому для матеріалів поле ховаємо. */
    function onItemTypeChange() {
        var type = utils.byId('newItemType').value;
        var price = utils.byId('newItemPrice');
        if (!price) return;

        price.hidden = type !== 'job';
        if (price.hidden) price.value = '';
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

        var fields = { name: name, unit: unit };

        if (type === 'job') {
            var price = prompt('Нова ціна:', item.price);
            if (price === null) return;
            if (!isFinite(parseFloat(price))) return alert('Ціна має бути числом');
            fields.price = price;
        }

        if (notifyError(catalog.updateItem(type, id, fields))) render.all();
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

    function setCurrentName(name) {
        var input = utils.byId('estimateName');
        if (input) input.value = name;
    }

    function currentDoc() {
        return estimateDoc.buildFromCurrent(currentName());
    }

    function saveCurrentEstimate() {
        var result = estimate.saveToArchive(currentName());
        if (!notifyError(result)) return;

        render.all();
        alert(result.updated ? 'Кошторис оновлено в архіві!' : 'Кошторис збережено в архів!');
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

    function editArchivedEstimate(id) {
        var result = estimate.loadForEdit(id);
        if (!notifyError(result)) return;

        setCurrentName(result.name);
        activateTab('jobs-content');

        if (result.missing.length > 0) {
            alert('Цих позицій уже немає в базі, тому їх не перенесено:\n• ' + result.missing.join('\n• '));
        }
    }

    function exitEditMode() {
        if (!estimate.editing()) return;
        if (!confirm('Вийти з режиму редагування? Незбережені зміни буде втрачено.')) return;

        estimate.exitEdit();
        setCurrentName(Calc.config.DEFAULT_ESTIMATE_NAME);
        render.all();
    }

    function deleteEstimate(id) {
        if (!confirm('Видалити цей кошторис з архіву?')) return;

        estimate.removeArchived(id);
        render.all();
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
        Calc.exportJson.importDatabase(event, function () {
            setCurrentName(Calc.config.DEFAULT_ESTIMATE_NAME);
            render.all();
        });
    }

    function init() {
        setCurrentName(Calc.config.DEFAULT_ESTIMATE_NAME);
        onItemTypeChange();
        render.all();
    }

    return {
        init: init,
        switchTab: switchTab,
        updateQty: updateQty,
        updateLinePrice: updateLinePrice,
        resetLinePrice: resetLinePrice,
        updateComment: updateComment,
        addCategory: addCategory,
        editCategory: editCategory,
        deleteCategory: deleteCategory,
        onItemTypeChange: onItemTypeChange,
        addNewItem: addNewItem,
        editItem: editItem,
        deleteItem: deleteItem,
        moveItemOrder: moveItemOrder,
        saveCurrentEstimate: saveCurrentEstimate,
        openPreviewModal: openPreviewModal,
        closePreviewModal: closePreviewModal,
        viewArchivedEstimate: viewArchivedEstimate,
        editArchivedEstimate: editArchivedEstimate,
        exitEditMode: exitEditMode,
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

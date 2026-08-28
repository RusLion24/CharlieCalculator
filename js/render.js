/* Рендер усіх екранів. Значення користувача завжди проходять через escapeHtml. */

window.Calc = window.Calc || {};

Calc.render = (function () {
    'use strict';

    var utils = Calc.utils;
    var store = Calc.store;
    var estimate = Calc.estimate;
    var esc = utils.escapeHtml;
    var money = utils.formatMoney;

    var CALCULATOR_CONTAINERS = {
        job: 'jobsCalculatorContainer',
        material: 'materialsCalculatorContainer'
    };

    var SETTINGS_TABLES = {
        job: 'settingsJobsTable',
        material: 'settingsMaterialsTable'
    };

    function all() {
        calculator('job');
        calculator('material');
        settingsCategories();
        settingsTables();
        categorySelect();
        savedEstimates();
        totals();
        editMode();
    }

    function qtyCell(type, item) {
        var qty = store.getQty(type, item.id);

        return '<td>' +
            '<input type="number" class="form-control form-control--compact" min="0" placeholder="0"' +
            ' aria-label="Кількість: ' + esc(item.name) + '"' +
            ' value="' + (qty ? esc(utils.formatQuantity(qty)) : '') + '"' +
            ' oninput="updateQty(\'' + type + '\', ' + item.id + ', this.value)">' +
            '</td>';
    }

    /** Ціну можна виправити прямо в розрахунку — правка діє лише на цей кошторис. */
    function priceCell(item) {
        var key = store.qtyKey('job', item.id);
        var edited = estimate.isPriceEdited('job', item.id);

        return '<td class="cell-price">' +
            '<input type="number" min="0" step="0.01"' +
            ' id="price_' + key + '"' +
            ' class="form-control form-control--compact price-input' + (edited ? ' is-price-edited' : '') + '"' +
            ' aria-label="Ціна: ' + esc(item.name) + '"' +
            ' value="' + money(estimate.priceOf('job', item.id)) + '"' +
            ' oninput="updateLinePrice(' + item.id + ', this.value)">' +
            '<button type="button" class="sort-btn price-reset"' +
            ' id="reset_' + key + '"' +
            (edited ? '' : ' hidden') +
            ' title="Повернути ціну з бази: ' + money(item.price) + '"' +
            ' onclick="resetLinePrice(' + item.id + ')">↺</button>' +
            '</td>';
    }

    function commentCell(item) {
        return '<td>' +
            '<input type="text" class="form-control form-control--compact"' +
            ' id="comment_' + store.qtyKey('material', item.id) + '"' +
            ' placeholder="Коментар"' +
            ' aria-label="Коментар: ' + esc(item.name) + '"' +
            ' value="' + esc(store.getComment('material', item.id)) + '"' +
            ' oninput="updateComment(' + item.id + ', this.value)">' +
            '</td>';
    }

    function calculatorRow(type, item) {
        var head = '<tr>' +
            '<td><span class="badge">' + esc(item.cat) + '</span></td>' +
            '<td>' + esc(item.name) + '</td>' +
            '<td>' + esc(item.unit) + '</td>';

        if (type === 'material') {
            return head + qtyCell(type, item) + commentCell(item) + '</tr>';
        }

        return head + priceCell(item) + qtyCell(type, item) +
            '<td id="total_' + store.qtyKey(type, item.id) + '">' +
            money(estimate.lineTotal(type, item.id)) +
            '</td></tr>';
    }

    function calculatorHead(type) {
        if (type === 'material') {
            return '<th>Категорія</th><th>Назва</th><th>Од. вим.</th>' +
                '<th style="width:150px;">Кількість</th><th>Коментар</th>';
        }

        return '<th>Категорія</th><th>Назва</th><th>Од. вим.</th><th style="width:170px;">Ціна (грн)</th>' +
            '<th style="width:150px;">Кількість</th><th>Разом (грн)</th>';
    }

    function calculator(type) {
        var container = utils.byId(CALCULATOR_CONTAINERS[type]);
        if (!container) return;

        var items = store.items(type);

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">База даних порожня. Додайте елементи в Налаштуваннях.</div>';
            return;
        }

        var rows = items.map(function (item) {
            return calculatorRow(type, item);
        }).join('');

        container.innerHTML =
            '<table>' +
                '<thead><tr>' + calculatorHead(type) + '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table>';
    }

    function lineTotal(type, id) {
        var cell = utils.byId('total_' + store.qtyKey(type, id));
        if (cell) cell.innerText = money(estimate.lineTotal(type, id));
    }

    /** Оновлює лише ознаку правки, щоб не перемальовувати рядок під час введення. */
    function linePriceState(id) {
        var key = store.qtyKey('job', id);
        var input = utils.byId('price_' + key);
        var reset = utils.byId('reset_' + key);
        var edited = estimate.isPriceEdited('job', id);

        if (input) input.classList.toggle('is-price-edited', edited);
        if (reset) reset.hidden = !edited;
    }

    function linePriceValue(id) {
        var input = utils.byId('price_' + store.qtyKey('job', id));
        if (input) input.value = money(estimate.priceOf('job', id));
    }

    function totals() {
        var grand = utils.byId('headerGrandTotal');
        if (grand) grand.innerText = money(estimate.totals().grandTotal);
    }

    function editMode() {
        var bar = utils.byId('editModeBar');
        var info = utils.byId('editModeInfo');
        var saveButton = utils.byId('saveEstimateBtn');
        var target = estimate.editing();

        if (bar) bar.hidden = !target;
        if (info && target) {
            info.innerText = 'Редагування кошторису з архіву: ' + target.name + ' (від ' + target.date + ')';
        }
        if (saveButton) {
            saveButton.innerText = target ? '💾 Оновити кошторис' : '💾 Зберегти в архів';
        }
    }

    function categorySelect() {
        var select = utils.byId('newItemCat');
        if (!select) return;

        var previous = select.value;
        select.innerHTML = store.get().categories.map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');

        if (previous) select.value = previous;
    }

    function settingsCategories() {
        var container = utils.byId('categoriesList');
        if (!container) return;

        var categories = store.get().categories;

        if (categories.length === 0) {
            container.innerHTML = '<div class="section-hint">Категорій ще немає.</div>';
            return;
        }

        // Індекс, а не назва: у назві можуть бути лапки, які поламали б inline-обробник.
        container.innerHTML = categories.map(function (name, index) {
            return '<span class="category-badge">' +
                '<span class="edit" onclick="editCategory(' + index + ')">✏️</span>' +
                esc(name) +
                '<span class="del" onclick="deleteCategory(' + index + ')">&times;</span>' +
                '</span>';
        }).join('');
    }

    function settingsRow(type, item, index) {
        var cells = '<td><span class="badge">' + esc(item.cat) + '</span></td>' +
            '<td>' + esc(item.name) + '</td>' +
            '<td>' + esc(item.unit) + '</td>';

        if (type === 'job') cells += '<td>' + money(item.price) + '</td>';

        return '<tr>' + cells +
            '<td class="cell-order">' +
                '<button class="sort-btn" onclick="moveItemOrder(\'' + type + '\', ' + index + ', \'up\')">▲</button>' +
                '<button class="sort-btn" onclick="moveItemOrder(\'' + type + '\', ' + index + ', \'down\')">▼</button>' +
            '</td>' +
            '<td class="cell-actions">' +
                '<button class="btn btn-info btn-sm" title="Редагувати" onclick="editItem(\'' + type + '\', ' + item.id + ')">✏️</button> ' +
                '<button class="btn btn-danger btn-sm" title="Видалити" onclick="deleteItem(\'' + type + '\', ' + item.id + ')">&times;</button>' +
            '</td>' +
            '</tr>';
    }

    function settingsTables() {
        Object.keys(SETTINGS_TABLES).forEach(function (type) {
            var body = utils.byId(SETTINGS_TABLES[type]);
            if (!body) return;

            var items = store.items(type);
            var columns = type === 'job' ? 6 : 5;

            if (items.length === 0) {
                body.innerHTML = '<tr><td colspan="' + columns + '" class="cell-empty">Позицій ще немає</td></tr>';
                return;
            }

            body.innerHTML = items.map(function (item, index) {
                return settingsRow(type, item, index);
            }).join('');
        });
    }

    function savedEstimates() {
        var body = utils.byId('savedEstimatesTable');
        if (!body) return;

        var list = estimate.archived();

        if (list.length === 0) {
            body.innerHTML = '<tr><td colspan="4" class="cell-empty">Архів порожній</td></tr>';
            return;
        }

        var editingId = store.getEditing();

        body.innerHTML = list.map(function (est) {
            return '<tr' + (est.id === editingId ? ' class="is-editing"' : '') + '>' +
                '<td>' + esc(est.date) + '</td>' +
                '<td><strong>' + esc(est.name) + '</strong></td>' +
                '<td class="cell-accent">' + money(est.jobsTotal) + ' грн</td>' +
                '<td class="cell-actions">' +
                    '<button class="btn btn-success btn-sm" title="Редагувати" onclick="editArchivedEstimate(' + est.id + ')">✏️</button> ' +
                    '<button class="btn btn-info btn-sm" title="Переглянути" onclick="viewArchivedEstimate(' + est.id + ')">👁️</button> ' +
                    '<button class="btn btn-secondary btn-sm" title="Друк / Зберегти як PDF" onclick="printArchivedEstimate(' + est.id + ')">🖨️</button> ' +
                    '<button class="btn btn-primary btn-sm" title="Завантажити PDF" onclick="downloadArchivedPdf(' + est.id + ')">📄</button> ' +
                    '<button class="btn btn-danger btn-sm" title="Видалити" onclick="deleteEstimate(' + est.id + ')">&times;</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    return {
        all: all,
        calculator: calculator,
        lineTotal: lineTotal,
        linePriceState: linePriceState,
        linePriceValue: linePriceValue,
        totals: totals,
        editMode: editMode,
        categorySelect: categorySelect,
        settingsCategories: settingsCategories,
        settingsTables: settingsTables,
        savedEstimates: savedEstimates
    };
})();

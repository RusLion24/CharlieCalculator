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
            var qty = store.getQty(type, item.id);
            var qtyValue = qty ? esc(utils.formatQuantity(qty)) : '';

            return '<tr>' +
                '<td><span class="badge">' + esc(item.cat) + '</span></td>' +
                '<td>' + esc(item.name) + '</td>' +
                '<td>' + esc(item.unit) + '</td>' +
                '<td>' + money(item.price) + '</td>' +
                '<td>' +
                    '<input type="number" class="form-control form-control--compact" min="0" placeholder="0"' +
                    ' aria-label="Кількість: ' + esc(item.name) + '"' +
                    ' value="' + qtyValue + '"' +
                    ' oninput="updateQty(\'' + type + '\', ' + item.id + ', this.value)">' +
                '</td>' +
                '<td id="total_' + store.qtyKey(type, item.id) + '">' + money(qty * item.price) + '</td>' +
                '</tr>';
        }).join('');

        container.innerHTML =
            '<table>' +
                '<thead><tr>' +
                    '<th>Категорія</th><th>Назва</th><th>Од. вим.</th><th>Ціна (грн)</th>' +
                    '<th style="width:150px;">Кількість</th><th>Разом (грн)</th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table>';
    }

    function lineTotal(type, id) {
        var cell = utils.byId('total_' + store.qtyKey(type, id));
        if (cell) cell.innerText = money(estimate.lineTotal(type, id));
    }

    function totals() {
        var result = estimate.totals();
        var jobs = utils.byId('headerJobsTotal');
        var materials = utils.byId('headerMaterialsTotal');
        var grand = utils.byId('headerGrandTotal');

        if (jobs) jobs.innerText = money(result.jobsTotal);
        if (materials) materials.innerText = money(result.materialsTotal);
        if (grand) grand.innerText = money(result.grandTotal);
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

    function settingsTables() {
        Object.keys(SETTINGS_TABLES).forEach(function (type) {
            var body = utils.byId(SETTINGS_TABLES[type]);
            if (!body) return;

            var items = store.items(type);

            if (items.length === 0) {
                body.innerHTML = '<tr><td colspan="6" class="cell-empty">Позицій ще немає</td></tr>';
                return;
            }

            body.innerHTML = items.map(function (item, index) {
                return '<tr>' +
                    '<td><span class="badge">' + esc(item.cat) + '</span></td>' +
                    '<td>' + esc(item.name) + '</td>' +
                    '<td>' + esc(item.unit) + '</td>' +
                    '<td>' + money(item.price) + '</td>' +
                    '<td class="cell-order">' +
                        '<button class="sort-btn" onclick="moveItemOrder(\'' + type + '\', ' + index + ', \'up\')">▲</button>' +
                        '<button class="sort-btn" onclick="moveItemOrder(\'' + type + '\', ' + index + ', \'down\')">▼</button>' +
                    '</td>' +
                    '<td class="cell-actions">' +
                        '<button class="btn btn-info btn-sm" title="Редагувати" onclick="editItem(\'' + type + '\', ' + item.id + ')">✏️</button> ' +
                        '<button class="btn btn-danger btn-sm" title="Видалити" onclick="deleteItem(\'' + type + '\', ' + item.id + ')">&times;</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        });
    }

    function savedEstimates() {
        var body = utils.byId('savedEstimatesTable');
        if (!body) return;

        var list = estimate.archived();

        if (list.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="cell-empty">Архів порожній</td></tr>';
            return;
        }

        body.innerHTML = list.map(function (est) {
            return '<tr>' +
                '<td>' + esc(est.date) + '</td>' +
                '<td><strong>' + esc(est.name) + '</strong></td>' +
                '<td>' + money(est.jobsTotal) + ' грн</td>' +
                '<td>' + money(est.materialsTotal) + ' грн</td>' +
                '<td class="cell-accent">' + money(est.grandTotal) + ' грн</td>' +
                '<td class="cell-actions">' +
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
        totals: totals,
        categorySelect: categorySelect,
        settingsCategories: settingsCategories,
        settingsTables: settingsTables,
        savedEstimates: savedEstimates
    };
})();

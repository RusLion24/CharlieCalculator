/* Модальне вікно перегляду + спільний HTML-рендер документа кошторису.
   Той самий рендер використовує друк (export-print.js), тому розмітка збігається. */

window.Calc = window.Calc || {};

Calc.preview = (function () {
    'use strict';

    var utils = Calc.utils;
    var estimateDoc = Calc.estimateDoc;
    var esc = utils.escapeHtml;
    var money = utils.formatMoney;

    var HEADERS = ['№', 'Назва', 'Од.', 'Ціна', 'К-сть', 'Сума'];

    function sectionHtml(section, prefix) {
        var rows = section.lines.map(function (line, index) {
            return '<tr>' +
                '<td>' + (index + 1) + '</td>' +
                '<td>' + esc(line.name) + '</td>' +
                '<td>' + esc(line.unit) + '</td>' +
                '<td class="estimate-doc__numeric">' + money(line.price) + '</td>' +
                '<td class="estimate-doc__numeric">' + esc(utils.formatQuantity(line.qty)) + '</td>' +
                '<td class="estimate-doc__numeric">' + money(line.total) + '</td>' +
                '</tr>';
        }).join('');

        var head = HEADERS.map(function (title) {
            return '<th>' + title + '</th>';
        }).join('');

        return '<h3 class="' + prefix + '__section-title estimate-doc__section-title">' + esc(section.title) + '</h3>' +
            '<div class="' + prefix + '__section">' +
            '<table>' +
                '<thead><tr>' + head + '</tr></thead>' +
                '<tbody>' + rows +
                    '<tr>' +
                        '<td colspan="5" class="estimate-doc__subtotal-label">' + esc(section.totalLabel) + '</td>' +
                        '<td class="estimate-doc__subtotal-value estimate-doc__numeric">' + money(section.total) + '</td>' +
                    '</tr>' +
                '</tbody>' +
            '</table>' +
            '</div>';
    }

    /**
     * @param {object} doc  модель з Calc.estimateDoc
     * @param {object} [options] prefix — префікс CSS-класів, header — шапка з назвою і датою,
     *                           signatures — рядки для підписів (потрібні на друку)
     */
    function renderDocumentHtml(doc, options) {
        var config = options || {};
        var prefix = config.prefix || 'estimate-doc';

        if (doc.isEmpty) {
            return '<p class="cell-empty">Немає вибраних позицій для відображення.</p>';
        }

        var html = '<div class="' + prefix + '">';

        if (config.header) {
            html += '<h2 class="' + prefix + '__title">' + esc(doc.name) + '</h2>' +
                '<p class="' + prefix + '__meta estimate-doc__meta">Дата складання: ' + esc(doc.date) + '</p>';
        }

        html += estimateDoc.sections(doc).map(function (section) {
            return sectionHtml(section, prefix);
        }).join('');

        html += '<div class="' + prefix + '__grand-total estimate-doc__grand-total">ЗАГАЛЬНА СУМА: ' +
            money(doc.grandTotal) + ' ' + Calc.config.CURRENCY + '</div>';

        if (config.signatures) {
            html += '<div class="' + prefix + '__signatures estimate-doc__signatures">' +
                '<div class="' + prefix + '__signature estimate-doc__signature">Виконавець (підпис, дата)</div>' +
                '<div class="' + prefix + '__signature estimate-doc__signature">Замовник (підпис, дата)</div>' +
                '</div>';
        }

        return html + '</div>';
    }

    function open(doc, title) {
        var modal = utils.byId('previewModal');
        var body = utils.byId('previewModalBody');
        var heading = utils.byId('previewModalTitle');

        if (!modal || !body) return;

        if (heading) heading.innerText = title || doc.name;
        body.innerHTML = renderDocumentHtml(doc, { header: false });
        modal.classList.add('show');
    }

    function close() {
        var modal = utils.byId('previewModal');
        if (modal) modal.classList.remove('show');
    }

    return {
        renderDocumentHtml: renderDocumentHtml,
        open: open,
        close: close
    };
})();

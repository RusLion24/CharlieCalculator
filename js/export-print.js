/* Друк кошторису. У діалозі браузера є пункт «Зберегти як PDF» — це основний,
   повністю автономний шлях отримати PDF без жодних бібліотек. */

window.Calc = window.Calc || {};

Calc.exportPrint = (function () {
    'use strict';

    var utils = Calc.utils;
    var preview = Calc.preview;

    function print(doc) {
        if (!doc) return { ok: false, error: 'Кошторис не знайдено' };
        if (doc.isEmpty) return { ok: false, error: 'Немає введених обсягів для друку.' };

        var root = utils.byId('printRoot');
        if (!root) return { ok: false, error: 'Не знайдено контейнер для друку' };

        root.innerHTML = preview.renderDocumentHtml(doc, {
            prefix: 'print-doc',
            header: true,
            signatures: true
        });

        window.print();
        return { ok: true };
    }

    return { print: print };
})();

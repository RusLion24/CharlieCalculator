/* Резервна копія: один файл містить прайс робіт, перелік матеріалів і архів кошторисів. */

window.Calc = window.Calc || {};

Calc.exportJson = (function () {
    'use strict';

    var utils = Calc.utils;
    var store = Calc.store;

    function fileName() {
        return Calc.config.EXPORT_FILE_NAME + '_' + utils.formatDateIso() + '.json';
    }

    /**
     * Safari на iPhone ігнорує атрибут download для data:-посилань і замість
     * збереження просто відкриває JSON, тому файл віддаємо через Blob.
     */
    function download(payload, name) {
        var blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        // Посилання має пережити клік, інакше Safari не встигає забрати файл.
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function exportDatabase() {
        download(JSON.stringify(store.get(), null, 2), fileName());
    }

    function importedSummary() {
        var data = store.get();

        return 'Дані імпортовано:\n' +
            '• робіт: ' + data.jobs.length + '\n' +
            '• матеріалів: ' + data.materials.length + '\n' +
            '• збережених кошторисів: ' + data.estimates.length;
    }

    function importDatabase(event, onDone) {
        var input = event.target;
        var file = input.files && input.files[0];
        if (!file) return;

        var reader = new FileReader();

        reader.onload = function (loadEvent) {
            var parsed;

            try {
                parsed = JSON.parse(loadEvent.target.result);
            } catch (error) {
                alert('Помилка при читанні JSON файлу.');
                return;
            }

            // store.replace сам перевіряє структуру і приводить типи до очікуваних.
            if (!store.replace(parsed)) {
                alert('Некоректна структура файлу JSON бази даних.');
                return;
            }

            store.resetCurrent();
            if (typeof onDone === 'function') onDone();
            alert(importedSummary());
        };

        reader.onerror = function () {
            alert('Не вдалося прочитати файл.');
        };

        reader.readAsText(file);
        input.value = '';
    }

    return {
        exportDatabase: exportDatabase,
        importDatabase: importDatabase
    };
})();

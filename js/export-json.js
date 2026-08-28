/* Резервна копія бази: вивантаження і відновлення через JSON-файл. */

window.Calc = window.Calc || {};

Calc.exportJson = (function () {
    'use strict';

    var store = Calc.store;

    function exportDatabase() {
        var payload = JSON.stringify(store.get(), null, 2);
        var href = 'data:text/json;charset=utf-8,' + encodeURIComponent(payload);
        var anchor = document.createElement('a');

        anchor.setAttribute('href', href);
        anchor.setAttribute('download', Calc.config.EXPORT_FILE_NAME);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
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

            store.clearQty();
            if (typeof onDone === 'function') onDone();
            alert('Базу даних успішно імпортовано та оновлено!');
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

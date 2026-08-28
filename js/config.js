/* Константи застосунку: ключ сховища, типова база, налаштування PDF. */

window.Calc = window.Calc || {};

Calc.config = {
    STORAGE_KEY: 'build_calc_db',
    CURRENCY: 'грн',

    DEFAULT_DATA: {
        categories: ['Загальнобудівельні', 'Електрика', 'Сантехніка', 'Оздоблення'],
        jobs: [
            { id: 1, cat: 'Загальнобудівельні', name: 'Демонтаж стін', unit: 'м2', price: 120 },
            { id: 2, cat: 'Оздоблення', name: 'Шпаклювання стін', unit: 'м2', price: 150 },
            { id: 3, cat: 'Оздоблення', name: 'Фарбування стін', unit: 'м2', price: 90 }
        ],
        materials: [
            { id: 1, cat: 'Загальнобудівельні', name: 'Цемент М-500 (25кг)', unit: 'міш.', price: 180 },
            { id: 2, cat: 'Оздоблення', name: 'Ґрунтовка (10л)', unit: 'кан.', price: 320 },
            { id: 3, cat: 'Оздоблення', name: 'Шпаклівка фінішна (25кг)', unit: 'міш.', price: 450 }
        ],
        estimates: []
    },

    PDF: {
        unit: 'mm',
        format: 'a4',
        marginX: 14,
        marginTop: 22,
        /** Ім'я має точно збігатися з тим, під яким шрифт зареєстровано у vendor/fonts. */
        fontName: 'Roboto'
    },

    EXPORT_FILE_NAME: 'building_calculator_db.json'
};

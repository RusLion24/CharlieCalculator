/* Генерація PDF через вендорений jsPDF + autoTable.
   Шрифт Roboto реєструють модулі vendor/fonts/*.js — стандартні шрифти PDF
   не містять кирилиці. */

window.Calc = window.Calc || {};

Calc.exportPdf = (function () {
    'use strict';

    var utils = Calc.utils;
    var estimateDoc = Calc.estimateDoc;
    var PDF = Calc.config.PDF;
    var FONT = PDF.fontName;

    var JOB_HEADERS = ['№', 'Назва', 'Од.', 'Ціна', 'К-сть', 'Сума'];
    var MATERIAL_HEADERS = ['№', 'Назва', 'Од.', 'К-сть'];

    function isAvailable() {
        return !!(window.jspdf && window.jspdf.jsPDF);
    }

    function hasFont(doc) {
        var list = doc.getFontList();
        return !!(list && list[FONT] && list[FONT].indexOf('bold') !== -1);
    }

    function createDoc() {
        var jsPDF = window.jspdf.jsPDF;
        return new jsPDF({ unit: PDF.unit, format: PDF.format, orientation: 'portrait' });
    }

    function drawHeader(pdf, model) {
        pdf.setFont(FONT, 'bold');
        pdf.setFontSize(14);
        pdf.text(model.name, PDF.marginX, 14);

        pdf.setFont(FONT, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(90);
        pdf.text('Дата складання: ' + model.date, PDF.marginX, 19);
        pdf.setTextColor(0);
    }

    function drawFooter(pdf) {
        var page = pdf.internal.getCurrentPageInfo().pageNumber;
        var width = pdf.internal.pageSize.getWidth();
        var height = pdf.internal.pageSize.getHeight();

        pdf.setFont(FONT, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text('Сторінка ' + page, width - PDF.marginX, height - 8, { align: 'right' });
        pdf.setTextColor(0);
    }

    function sectionHeaders(section) {
        if (section.kind !== 'material') return JOB_HEADERS;
        return section.showComment ? MATERIAL_HEADERS.concat('Коментар') : MATERIAL_HEADERS;
    }

    function sectionRows(section) {
        return section.lines.map(function (line, index) {
            if (section.kind !== 'material') {
                return [
                    String(index + 1),
                    line.name,
                    line.unit,
                    utils.formatMoney(line.price),
                    utils.formatQuantity(line.qty),
                    utils.formatMoney(line.total)
                ];
            }

            var row = [
                String(index + 1),
                line.name,
                line.unit,
                utils.formatQuantity(line.qty)
            ];

            if (section.showComment) row.push(line.comment);
            return row;
        });
    }

    /** Ширини колонок різні: у матеріалів немає ціни й суми, зате може бути коментар. */
    function columnStylesFor(section) {
        if (section.kind !== 'material') {
            return {
                0: { cellWidth: 10, halign: 'right' },
                2: { cellWidth: 16 },
                3: { cellWidth: 24, halign: 'right' },
                4: { cellWidth: 20, halign: 'right' },
                5: { cellWidth: 28, halign: 'right' }
            };
        }

        return {
            0: { cellWidth: 10, halign: 'right' },
            2: { cellWidth: 16 },
            3: { cellWidth: 20, halign: 'right' }
        };
    }

    /** Шрифт треба вказати в КОЖНІЙ групі стилів, інакше autoTable візьме helvetica. */
    function tableStyles() {
        return {
            styles: {
                font: FONT,
                fontStyle: 'normal',
                fontSize: 9,
                cellPadding: 1.8,
                lineColor: [200, 200, 200],
                lineWidth: 0.1
            },
            headStyles: {
                font: FONT,
                fontStyle: 'bold',
                fillColor: [30, 41, 59],
                textColor: 255
            },
            footStyles: {
                font: FONT,
                fontStyle: 'bold',
                fillColor: [241, 245, 249],
                textColor: 20
            },
            bodyStyles: {
                font: FONT,
                fontStyle: 'normal'
            }
        };
    }

    function addSection(pdf, section, startY) {
        pdf.setFont(FONT, 'bold');
        pdf.setFontSize(11);
        pdf.text(section.title, PDF.marginX, startY);

        var styles = tableStyles();

        var options = {
            head: [sectionHeaders(section)],
            body: sectionRows(section),
            startY: startY + 3,
            margin: { left: PDF.marginX, right: PDF.marginX, top: PDF.marginTop },
            theme: 'grid',
            styles: styles.styles,
            headStyles: styles.headStyles,
            footStyles: styles.footStyles,
            bodyStyles: styles.bodyStyles,
            columnStyles: columnStylesFor(section),
            showHead: 'everyPage',
            showFoot: 'lastPage',
            didDrawPage: function () {
                drawFooter(pdf);
            }
        };

        if (section.kind !== 'material') {
            options.foot = [['', section.totalLabel, '', '', '', utils.formatMoney(section.total)]];
        }

        pdf.autoTable(options);

        return pdf.lastAutoTable.finalY;
    }

    function addSignatures(pdf, y) {
        var width = pdf.internal.pageSize.getWidth();
        var lineWidth = (width - PDF.marginX * 2 - 15) / 2;
        var right = PDF.marginX + lineWidth + 15;

        pdf.setDrawColor(120);
        pdf.line(PDF.marginX, y, PDF.marginX + lineWidth, y);
        pdf.line(right, y, right + lineWidth, y);

        pdf.setFont(FONT, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(90);
        pdf.text('Виконавець (підпис, дата)', PDF.marginX, y + 4);
        pdf.text('Замовник (підпис, дата)', right, y + 4);
        pdf.setTextColor(0);
    }

    /** Не дублюємо слово «Кошторис», якщо назва об'єкта вже з нього починається. */
    function fileNameFor(model) {
        var name = String(model.name || '').trim();
        var prefixed = /^кошторис/i.test(name) ? name : 'Кошторис — ' + name;
        return utils.sanitizeFileName(prefixed);
    }

    function save(model) {
        if (!model) return { ok: false, error: 'Кошторис не знайдено' };
        if (model.isEmpty) return { ok: false, error: 'Немає введених обсягів для експорту.' };

        if (!isAvailable()) {
            return {
                ok: false,
                error: 'Бібліотеку jsPDF не завантажено. Перевірте, що каталог vendor/ на місці.'
            };
        }

        var pdf = createDoc();

        if (!hasFont(pdf)) {
            return {
                ok: false,
                error: 'Кириличний шрифт не зареєстровано. Перевірте vendor/fonts/roboto-normal.js і roboto-bold.js.'
            };
        }

        pdf.setFont(FONT, 'normal');
        drawHeader(pdf, model);
        drawFooter(pdf);

        var cursorY = PDF.marginTop + 4;

        estimateDoc.sections(model).forEach(function (section) {
            cursorY = addSection(pdf, section, cursorY) + 10;
        });

        var pageHeight = pdf.internal.pageSize.getHeight();

        if (cursorY > pageHeight - 30) {
            pdf.addPage();
            drawHeader(pdf, model);
            drawFooter(pdf);
            cursorY = PDF.marginTop + 4;
        }

        pdf.setFont(FONT, 'bold');
        pdf.setFontSize(13);
        pdf.text(
            'ЗАГАЛЬНА СУМА: ' + utils.formatMoney(model.grandTotal) + ' ' + Calc.config.CURRENCY,
            pdf.internal.pageSize.getWidth() - PDF.marginX,
            cursorY,
            { align: 'right' }
        );

        addSignatures(pdf, Math.min(cursorY + 25, pageHeight - 20));

        pdf.save(fileNameFor(model) + '.pdf');
        return { ok: true };
    }

    return {
        isAvailable: isAvailable,
        save: save
    };
})();

import { Workbook } from "exceljs";

export async function buildXlsxBufferFromRows(
    sheetName: string,
    headers: string[],
    rows: Array<Record<string, string | number | boolean | null | undefined>>
): Promise<Buffer> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.addRow(headers);

    for (const row of rows) {
        worksheet.addRow(headers.map((header) => row[header] ?? ""));
    }

    worksheet.columns.forEach((column) => {
        let maxLength = 12;

        if (column.eachCell === undefined) return;

        column.eachCell({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value === null || cell.value === undefined ? "" : String(cell.value);
            maxLength = Math.max(maxLength, cellValue.length + 2);
        });

        column.width = maxLength;
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(arrayBuffer);
}
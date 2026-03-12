function escapeCsvValue(value: string): string {
    const normalizedValue = value.replace(/"/g, '""');

    return `"${normalizedValue}"`;
}

function serializeValue(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
        return "";
    }

    return escapeCsvValue(String(value));
}

export function buildCsvFromRows(
    headers: string[],
    rows: Array<Record<string, string | number | boolean | null | undefined>>
): string {
    const headerLine = headers.map((header) => escapeCsvValue(header)).join(",");

    const lines = rows.map((row) =>
        headers.map((header) => serializeValue(row[header])).join(",")
    );

    return [headerLine, ...lines].join("\n");
}
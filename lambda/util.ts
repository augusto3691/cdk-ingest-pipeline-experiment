import { Readable } from "stream";

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", chunk => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

export function convertToCsv(rows: any[]): string {
    if (rows.length === 0) return "";

    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(","), // Cabeçalho
        ...rows.map(row =>
            headers.map(field => `"${(row[field] ?? "").toString().replace(/"/g, '""')}"`).join(",")
        )
    ];
    return lines.join("\n");
}
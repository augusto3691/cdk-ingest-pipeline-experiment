import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import axios from "axios";
import * as parquet from "parquets";
import { tmpdir } from "os";
import { PassThrough, Readable } from "stream";
import { join } from "path";
import { promises as fs } from "fs";
import { v4 } from "uuid";
import { convertToCsv, streamToBuffer } from "./util";

const s3 = new S3Client({});
const bucket = process.env.TEMP_BUCKET!;


export const fetchAndWritePage = async (page: number, uuid: string) => {
    const response = await axios.get(`https://rickandmortyapi.com/api/character?page=${page}`);
    const results = response.data.results;
    const tmpFile = join(tmpdir(), `characters_page_${page}.parquet`);

    // Schema Parquet
    const schema = new parquet.ParquetSchema({
        id: { type: "INT64" },
        name: { type: "UTF8" },
    });

    const chunks: Buffer[] = [];
    const pass = new PassThrough();

    // Colete os chunks enquanto escreve
    pass.on("data", (chunk) => chunks.push(chunk));

    const writer = await parquet.ParquetWriter.openFile(schema, tmpFile);

    for (const c of results) {
        await writer.appendRow({ id: c.id, name: c.name });
    }

    await writer.close();

    const fileBuffer = await fs.readFile(tmpFile);
    const key = `characters_page_${page}.parquet`;

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: `${uuid}/${key}`,
            Body: fileBuffer,
        })
    );

    console.log(`Uploaded ${key} to ${bucket}`);
    return `s3://${bucket}/${key}`;
}

export const ingestAllPages = async (): Promise<string> => {
    const firstPage = await axios.get('https://rickandmortyapi.com/api/character?page=1');
    const totalPages = firstPage.data.info.pages;
    const uuid = v4();

    for (let page = 1; page <= totalPages; page++) {
        console.log(`Processing page ${page} of ${totalPages}`);
        await fetchAndWritePage(page, uuid);
    }

    return uuid;
};

export const processAllFiles = async (bucketKey: string) => {
    const outputKey = `${bucketKey}/processed/output.csv`;

    const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: bucketKey
    });

    const listed = await s3.send(listCommand);

    const parquetKeys = (listed.Contents || [])
        .map(obj => obj.Key)
        .filter((key): key is string => !!key && key.endsWith(".parquet"));

    if (parquetKeys.length === 0) {
        return { statusCode: 404, body: "No one found" };
    }

    const rows: any[] = [];

    for (const key of parquetKeys) {
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bodyStream = obj.Body as Readable;

        const buffer = await streamToBuffer(bodyStream);
        const reader = await parquet.ParquetReader.openBuffer(buffer);
        const cursor = reader.getCursor();
        let record: any;

        while ((record = await cursor.next())) {
            rows.push(record);
        }

        await reader.close();
    }

    const csvData = convertToCsv(rows);

    // Salva no S3
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: outputKey,
            Body: csvData,
            ContentType: "text/csv"
        })
    );

    return {
        bucket,
        outputKey
    };

}


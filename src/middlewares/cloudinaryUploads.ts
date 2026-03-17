// src/middlewares/cloudinaryUploads.ts

import type { Request } from "express";
import multer, { type StorageEngine } from "multer";
import {
    v2 as cloudinary,
    type UploadApiErrorResponse,
    type UploadApiResponse,
} from "cloudinary";
import { getEnv } from "@/src/config/env";

const env = getEnv();

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

type CloudinaryAllowedFormat =
    | "jpg"
    | "jpeg"
    | "png"
    | "webp"
    | "gif"
    | "pdf"
    | "mp3"
    | "wav"
    | "mp4"
    | "mov"
    | "webm"
    | "m4a"
    | "aac"
    | "ogg"
    | "doc"
    | "docx"
    | "txt"
    | "csv"
    | "xls"
    | "xlsx"
    | "ppt"
    | "pptx";

type CloudinaryTransformation = {
    width?: number;
    height?: number;
    crop?: "limit" | "fill" | "scale" | "fit";
};

type CloudinaryUploadInfo = {
    path: string;
    filename: string;
    size: number;
    mimetype: string;
};

export type ExportedCloudinaryFileUploadResult = {
    fileUrl: string;
    filePublicId: string;
    fileResourceType: CloudinaryResourceType;
    fileName: string;
    fileFormat: string | null;
    fileBytes: number;
};

type UploadExportedFileInput = {
    filePath: string;
    fileName: string;
    folder?: string;
    resourceType?: Extract<CloudinaryResourceType, "raw" | "auto">;
    allowedFormats?: CloudinaryAllowedFormat[];
};

type MulterFileCallback = (
    error?: Error | null,
    info?: Partial<Express.Multer.File>
) => void;

type StorageOptions = {
    folder: string;
    resourceType?: CloudinaryResourceType;
    allowedFormats?: CloudinaryAllowedFormat[];
    transformation?: CloudinaryTransformation[];
};

function buildSafeFileName(fileName: string): string {
    const baseName = fileName.includes(".")
        ? fileName.substring(0, fileName.lastIndexOf("."))
        : fileName;

    const normalizedName = baseName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

    return normalizedName.length > 0 ? normalizedName : "file";
}

function getFileExtension(fileName: string): string | null {
    const lastDotIndex = fileName.lastIndexOf(".");

    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
        return null;
    }

    return fileName.substring(lastDotIndex + 1).toLowerCase();
}

function isAllowedFormat(
    fileName: string,
    allowedFormats: CloudinaryAllowedFormat[]
): boolean {
    const extension = getFileExtension(fileName);

    if (!extension) {
        return false;
    }

    return allowedFormats.includes(extension as CloudinaryAllowedFormat);
}

function inferMimeType(
    originalMimeType: string,
    resultFormat: string | undefined,
    resourceType: CloudinaryResourceType
): string {
    if (!resultFormat) {
        return originalMimeType;
    }

    if (resourceType === "image") {
        return `image/${resultFormat}`;
    }

    if (resourceType === "video") {
        return `video/${resultFormat}`;
    }

    if (resourceType === "raw") {
        if (resultFormat === "pdf") {
            return "application/pdf";
        }

        return originalMimeType;
    }

    if (resultFormat === "pdf") {
        return "application/pdf";
    }

    return originalMimeType;
}

function normalizeCloudinaryResourceType(
    resourceType: string | undefined,
    fallback: CloudinaryResourceType
): CloudinaryResourceType {
    if (
        resourceType === "image" ||
        resourceType === "video" ||
        resourceType === "raw" ||
        resourceType === "auto"
    ) {
        return resourceType;
    }

    return fallback;
}

class CustomCloudinaryStorage implements StorageEngine {
    private readonly folder: string;
    private readonly resourceType: CloudinaryResourceType;
    private readonly allowedFormats: CloudinaryAllowedFormat[];
    private readonly transformation?: CloudinaryTransformation[];

    constructor(options: StorageOptions) {
        this.folder = options.folder;
        this.resourceType = options.resourceType ?? "image";
        this.allowedFormats = options.allowedFormats ?? ["jpg", "jpeg", "png", "webp"];
        this.transformation = options.transformation;
    }

    _handleFile(req: Request, file: Express.Multer.File, cb: MulterFileCallback): void {
        if (!isAllowedFormat(file.originalname, this.allowedFormats)) {
            cb(
                new Error(
                    `Formato de archivo no permitido. Permitidos: ${this.allowedFormats.join(", ")}.`
                )
            );
            return;
        }

        const cleanName = buildSafeFileName(file.originalname);
        const publicId = `${cleanName}_${Date.now()}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: this.folder,
                resource_type: this.resourceType,
                public_id: publicId,
                transformation: this.transformation,
            },
            (
                error: UploadApiErrorResponse | undefined,
                result: UploadApiResponse | undefined
            ) => {
                if (error) {
                    cb(error);
                    return;
                }

                if (!result) {
                    cb(new Error("Cloudinary upload failed - no result."));
                    return;
                }

                const uploadInfo: CloudinaryUploadInfo = {
                    path: result.secure_url,
                    filename: result.public_id,
                    size: result.bytes,
                    mimetype: inferMimeType(file.mimetype, result.format, this.resourceType),
                };

                cb(null, uploadInfo);
            }
        );

        file.stream.pipe(uploadStream);
    }

    _removeFile(
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null) => void
    ): void {
        const publicId =
            typeof file.filename === "string" && file.filename.trim().length > 0
                ? file.filename
                : "";

        if (!publicId) {
            cb(null);
            return;
        }

        cloudinary.uploader.destroy(
            publicId,
            { resource_type: this.resourceType },
            (error?: UploadApiErrorResponse) => {
                cb(error ?? null);
            }
        );
    }
}

export const uploadUserProfileImage = multer({
    storage: new CustomCloudinaryStorage({
        folder: "erp-expenses/users",
        resourceType: "image",
        allowedFormats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 1600, height: 1600, crop: "limit" }],
    }),
});

export const uploadReceiptFile = multer({
    storage: new CustomCloudinaryStorage({
        folder: "erp-expenses/receipts",
        resourceType: "auto",
        allowedFormats: ["jpg", "jpeg", "png", "webp", "pdf"],
    }),
});

export async function uploadExportedFile({
    filePath,
    fileName,
    folder = "erp-expenses/reports-exports",
    resourceType = "raw",
    allowedFormats = ["csv", "xls", "xlsx"],
}: UploadExportedFileInput): Promise<ExportedCloudinaryFileUploadResult> {
    if (!isAllowedFormat(fileName, allowedFormats)) {
        throw new Error(
            `Formato de archivo no permitido. Permitidos: ${allowedFormats.join(", ")}.`
        );
    }

    const cleanName = buildSafeFileName(fileName);
    const publicId = `${cleanName}_${Date.now()}`;

    const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
        overwrite: true,
    });

    return {
        fileUrl: result.secure_url,
        filePublicId: result.public_id,
        fileResourceType: normalizeCloudinaryResourceType(
            result.resource_type,
            resourceType
        ),
        fileName,
        fileFormat: result.format ?? getFileExtension(fileName),
        fileBytes: result.bytes,
    };
}

export async function deleteFromCloudinary(
    publicId: string,
    resourceType: CloudinaryResourceType = "image"
): Promise<void> {
    if (!publicId || publicId.trim().length === 0) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        cloudinary.uploader.destroy(
            publicId,
            { resource_type: resourceType },
            (error?: UploadApiErrorResponse, result?: { result?: string }) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (
                    result?.result === "ok" ||
                    result?.result === "not found" ||
                    result?.result === undefined
                ) {
                    resolve();
                    return;
                }

                resolve();
            }
        );
    });
}

export { cloudinary };
// src/types/multer-storage-cloudinary.d.ts

declare module "multer-storage-cloudinary" {
    import type { Request } from "express";
    import type { StorageEngine } from "multer";
    import type { v2 as CloudinaryV2 } from "cloudinary";

    export type CloudinaryAllowedFormat =
        | "jpg"
        | "jpeg"
        | "png"
        | "webp"
        | "pdf";

    export type CloudinaryResourceType = "image" | "raw" | "video" | "auto";

    export interface CloudinaryTransformation {
        width?: number;
        height?: number;
        crop?: "limit" | "fill" | "scale" | "fit";
    }

    export interface CloudinaryStorageParams {
        folder?: string;
        allowed_formats?: CloudinaryAllowedFormat[];
        resource_type?: CloudinaryResourceType;
        public_id?: (req: Request, file: Express.Multer.File) => string;
        transformation?: CloudinaryTransformation[];
    }

    export interface CloudinaryStorageOptions {
        cloudinary: typeof CloudinaryV2;
        params:
        | CloudinaryStorageParams
        | ((req: Request, file: Express.Multer.File) => CloudinaryStorageParams);
    }

    export class CloudinaryStorage implements StorageEngine {
        constructor(options: CloudinaryStorageOptions);
        _handleFile(
            req: Request,
            file: Express.Multer.File,
            callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void
        ): void;
        _removeFile(
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null) => void
        ): void;
    }
}
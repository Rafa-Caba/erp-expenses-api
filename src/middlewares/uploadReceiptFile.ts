// src/middlewares/uploadReceiptFile.ts

import type { Request } from "express";
import multer from "multer";
import multerStorageCloudinary = require("multer-storage-cloudinary");

import cloudinary from "@/src/config/cloudinary";

type CloudinaryReceiptFormat = "jpg" | "jpeg" | "png" | "webp" | "pdf";

type CloudinaryReceiptParams = {
    folder: string;
    allowed_formats: CloudinaryReceiptFormat[];
    resource_type: "image" | "raw" | "video" | "auto";
    public_id: (req: Request, file: Express.Multer.File) => string;
};

type CloudinaryStorageConstructor = new (options: {
    cloudinary: typeof cloudinary;
    params:
    | CloudinaryReceiptParams
    | ((req: Request, file: Express.Multer.File) => CloudinaryReceiptParams);
}) => multer.StorageEngine;

type MulterStorageCloudinaryModule = {
    CloudinaryStorage?: CloudinaryStorageConstructor;
    default?: {
        CloudinaryStorage?: CloudinaryStorageConstructor;
    };
};

function resolveCloudinaryStorageConstructor(): CloudinaryStorageConstructor {
    const storageModule = multerStorageCloudinary as MulterStorageCloudinaryModule;

    const candidateConstructor =
        storageModule.CloudinaryStorage ?? storageModule.default?.CloudinaryStorage;

    if (!candidateConstructor) {
        throw new Error(
            'No se pudo resolver CloudinaryStorage desde "multer-storage-cloudinary".'
        );
    }

    return candidateConstructor;
}

const CloudinaryStorage = resolveCloudinaryStorageConstructor();

function buildSafeFileName(fileName: string): string {
    const baseName = fileName.includes(".")
        ? fileName.substring(0, fileName.lastIndexOf("."))
        : fileName;

    return baseName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

const receiptStorage = new CloudinaryStorage({
    cloudinary,
    params: (
        req: Request,
        file: Express.Multer.File
    ): CloudinaryReceiptParams => {
        const safeName = buildSafeFileName(file.originalname);

        return {
            folder: "erp-expenses/receipts",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
            resource_type: "auto",
            public_id: (): string => `receipt_${safeName}_${Date.now()}`,
        };
    },
});

export const uploadReceiptFile = multer({
    storage: receiptStorage,
});
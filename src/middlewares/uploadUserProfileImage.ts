// src/middlewares/uploadUserProfileImage.ts

import type { Request } from "express";
import multer from "multer";
import multerStorageCloudinary = require("multer-storage-cloudinary");

import cloudinary from "@/src/config/cloudinary";

type CloudinaryUserImageFormat = "jpg" | "jpeg" | "png" | "webp";

type CloudinaryTransformation = {
    width: number;
    height: number;
    crop: "limit" | "fill" | "scale" | "fit";
};

type CloudinaryUserImageParams = {
    folder: string;
    allowed_formats: CloudinaryUserImageFormat[];
    resource_type: "image" | "raw" | "video" | "auto";
    public_id: (req: Request, file: Express.Multer.File) => string;
    transformation: CloudinaryTransformation[];
};

type CloudinaryStorageConstructor = new (options: {
    cloudinary: typeof cloudinary;
    params:
    | CloudinaryUserImageParams
    | ((req: Request, file: Express.Multer.File) => CloudinaryUserImageParams);
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

const userProfileImageStorage = new CloudinaryStorage({
    cloudinary,
    params: (
        req: Request,
        file: Express.Multer.File
    ): CloudinaryUserImageParams => {
        const safeName = buildSafeFileName(file.originalname);

        return {
            folder: "erp-expenses/users",
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            resource_type: "image",
            public_id: (): string => `user_${safeName}_${Date.now()}`,
            transformation: [{ width: 1600, height: 1600, crop: "limit" }],
        };
    },
});

export const uploadUserProfileImage = multer({
    storage: userProfileImageStorage,
});
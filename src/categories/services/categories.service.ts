// src/categories/services/categories.service.ts

import { Types } from "mongoose";

import { CategoryModel, type CategoryDocument } from "../models/Category.model";
import type {
    ArchiveCategoryServiceInput,
    CategoryType,
    CreateCategoryServiceInput,
    UpdateCategoryServiceInput,
} from "../types/category.types";

function normalizeNullableString(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function canChildTypeFitParent(parentType: CategoryType, childType: CategoryType): boolean {
    if (parentType === "BOTH") {
        return true;
    }

    return parentType === childType;
}

async function findCategoryById(
    workspaceId: Types.ObjectId,
    categoryId: Types.ObjectId
): Promise<CategoryDocument | null> {
    return CategoryModel.findOne({
        _id: categoryId,
        workspaceId,
    }).lean<CategoryDocument | null>();
}

async function ensureUniqueCategoryName(
    workspaceId: Types.ObjectId,
    name: string,
    excludeCategoryId?: Types.ObjectId
): Promise<void> {
    const existingCategory = await CategoryModel.findOne({
        workspaceId,
        name,
        ...(excludeCategoryId ? { _id: { $ne: excludeCategoryId } } : {}),
    }).lean<CategoryDocument | null>();

    if (existingCategory) {
        throw new CategoryServiceError(
            "Ya existe una categoría con ese nombre en este workspace.",
            409,
            "CATEGORY_NAME_ALREADY_EXISTS"
        );
    }
}

async function ensureValidParentCategory(options: {
    workspaceId: Types.ObjectId;
    parentCategoryId: Types.ObjectId | null;
    childCategoryId?: Types.ObjectId;
    childType: CategoryType;
}): Promise<void> {
    const { workspaceId, parentCategoryId, childCategoryId, childType } = options;

    if (!parentCategoryId) {
        return;
    }

    if (childCategoryId && parentCategoryId.equals(childCategoryId)) {
        throw new CategoryServiceError(
            "Una categoría no puede ser su propia categoría padre.",
            400,
            "CATEGORY_SELF_PARENT_NOT_ALLOWED"
        );
    }

    const parentCategory = await CategoryModel.findOne({
        _id: parentCategoryId,
        workspaceId,
    }).lean<CategoryDocument | null>();

    if (!parentCategory) {
        throw new CategoryServiceError(
            "La categoría padre no existe en este workspace.",
            404,
            "PARENT_CATEGORY_NOT_FOUND"
        );
    }

    if (parentCategory.parentCategoryId) {
        throw new CategoryServiceError(
            "Solo se permite un nivel de subcategoría.",
            400,
            "CATEGORY_MAX_DEPTH_REACHED"
        );
    }

    if (!canChildTypeFitParent(parentCategory.type, childType)) {
        throw new CategoryServiceError(
            "El tipo de la subcategoría no puede contradecir el tipo de la categoría padre.",
            400,
            "CATEGORY_TYPE_CONFLICT"
        );
    }
}

async function ensureCategoryHasNoChildren(
    workspaceId: Types.ObjectId,
    categoryId: Types.ObjectId
): Promise<void> {
    const childCategory = await CategoryModel.findOne({
        workspaceId,
        parentCategoryId: categoryId,
        isActive: true,
    }).lean<CategoryDocument | null>();

    if (childCategory) {
        throw new CategoryServiceError(
            "No se puede archivar una categoría que tiene subcategorías activas.",
            409,
            "CATEGORY_HAS_CHILDREN"
        );
    }
}

export class CategoryServiceError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.name = "CategoryServiceError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

export function isCategoryServiceError(error: Error): error is CategoryServiceError {
    return error instanceof CategoryServiceError;
}

export async function getCategoriesService(
    workspaceId: Types.ObjectId
): Promise<CategoryDocument[]> {
    return CategoryModel.find({
        workspaceId,
        isActive: true,
    })
        .sort({
            sortOrder: 1,
            name: 1,
            createdAt: 1,
        })
        .lean<CategoryDocument[]>();
}

export async function getCategoryByIdService(
    workspaceId: Types.ObjectId,
    categoryId: Types.ObjectId
): Promise<CategoryDocument | null> {
    return findCategoryById(workspaceId, categoryId);
}

export async function createCategoryService(
    input: CreateCategoryServiceInput
): Promise<CategoryDocument> {
    const { workspaceId, body } = input;

    const normalizedName = body.name.trim();
    const normalizedParentCategoryId = body.parentCategoryId
        ? new Types.ObjectId(body.parentCategoryId)
        : null;

    await ensureUniqueCategoryName(workspaceId, normalizedName);
    await ensureValidParentCategory({
        workspaceId,
        parentCategoryId: normalizedParentCategoryId,
        childType: body.type,
    });

    const category = await CategoryModel.create({
        workspaceId,
        name: normalizedName,
        type: body.type,
        parentCategoryId: normalizedParentCategoryId,
        color: normalizeNullableString(body.color),
        icon: normalizeNullableString(body.icon),
        description: normalizeNullableString(body.description),
        sortOrder: body.sortOrder ?? 0,
        isSystem: body.isSystem ?? false,
        isActive: body.isActive ?? true,
        isVisible: body.isVisible ?? true,
    });

    return {
        _id: category._id,
        workspaceId: category.workspaceId,
        name: category.name,
        type: category.type,
        parentCategoryId: category.parentCategoryId ?? null,
        color: category.color ?? null,
        icon: category.icon ?? null,
        description: category.description ?? null,
        sortOrder: category.sortOrder ?? 0,
        isSystem: category.isSystem ?? false,
        isActive: category.isActive,
        isVisible: category.isVisible ?? true,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
    };
}

export async function updateCategoryService(
    input: UpdateCategoryServiceInput
): Promise<CategoryDocument | null> {
    const { workspaceId, categoryId, body } = input;

    const existingCategory = await findCategoryById(workspaceId, categoryId);

    if (!existingCategory) {
        return null;
    }

    const nextName =
        body.name !== undefined ? body.name.trim() : existingCategory.name;

    if (body.name !== undefined) {
        if (existingCategory.isSystem && nextName !== existingCategory.name) {
            throw new CategoryServiceError(
                "No se puede cambiar el nombre de una categoría del sistema.",
                403,
                "SYSTEM_CATEGORY_NAME_LOCKED"
            );
        }

        await ensureUniqueCategoryName(workspaceId, nextName, categoryId);
    }

    const nextType = body.type ?? existingCategory.type;

    if (body.type !== undefined) {
        if (existingCategory.isSystem && body.type !== existingCategory.type) {
            throw new CategoryServiceError(
                "No se puede cambiar el tipo de una categoría del sistema.",
                403,
                "SYSTEM_CATEGORY_TYPE_LOCKED"
            );
        }
    }

    const nextParentCategoryId =
        body.parentCategoryId !== undefined
            ? body.parentCategoryId
                ? new Types.ObjectId(body.parentCategoryId)
                : null
            : existingCategory.parentCategoryId ?? null;

    await ensureValidParentCategory({
        workspaceId,
        parentCategoryId: nextParentCategoryId,
        childCategoryId: categoryId,
        childType: nextType,
    });

    const updatedCategory = await CategoryModel.findOneAndUpdate(
        {
            _id: categoryId,
            workspaceId,
        },
        {
            $set: {
                name: nextName,
                type: nextType,
                parentCategoryId: nextParentCategoryId,
                color:
                    body.color !== undefined
                        ? normalizeNullableString(body.color)
                        : existingCategory.color ?? null,
                icon:
                    body.icon !== undefined
                        ? normalizeNullableString(body.icon)
                        : existingCategory.icon ?? null,
                description:
                    body.description !== undefined
                        ? normalizeNullableString(body.description)
                        : existingCategory.description ?? null,
                sortOrder:
                    body.sortOrder !== undefined
                        ? body.sortOrder
                        : existingCategory.sortOrder ?? 0,
                isActive:
                    body.isActive !== undefined
                        ? body.isActive
                        : existingCategory.isActive,
                isVisible:
                    body.isVisible !== undefined
                        ? body.isVisible
                        : existingCategory.isVisible ?? true,
            },
        },
        {
            new: true,
        }
    ).lean<CategoryDocument | null>();

    return updatedCategory;
}

export async function archiveCategoryService(
    input: ArchiveCategoryServiceInput
): Promise<CategoryDocument | null> {
    const { workspaceId, categoryId } = input;

    const existingCategory = await findCategoryById(workspaceId, categoryId);

    if (!existingCategory) {
        return null;
    }

    if (existingCategory.isSystem) {
        throw new CategoryServiceError(
            "No se puede archivar una categoría del sistema.",
            403,
            "SYSTEM_CATEGORY_DELETE_LOCKED"
        );
    }

    await ensureCategoryHasNoChildren(workspaceId, categoryId);

    const archivedCategory = await CategoryModel.findOneAndUpdate(
        {
            _id: categoryId,
            workspaceId,
        },
        {
            $set: {
                isActive: false,
            },
        },
        {
            new: true,
        }
    ).lean<CategoryDocument | null>();

    return archivedCategory;
}
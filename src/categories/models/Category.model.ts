// src/categories/models/Category.model.ts

import { Schema, model, type Model, type Types } from "mongoose";

import type { CategoryType } from "@/src/categories/types/category.types";
import { CATEGORY_TYPES } from "@/src/categories/types/category.types";

export interface CategoryDocument {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    name: string;
    type: CategoryType;
    parentCategoryId?: Types.ObjectId | null;
    color?: string | null;
    icon?: string | null;
    description?: string | null;
    sortOrder?: number;
    isSystem?: boolean;
    isActive: boolean;
    isVisible?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const categorySchema = new Schema<CategoryDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        type: {
            type: String,
            enum: CATEGORY_TYPES,
            required: true,
            trim: true,
        },
        parentCategoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
            index: true,
        },
        color: {
            type: String,
            trim: true,
            maxlength: 30,
            default: null,
            validate: {
                validator(value: string | null): boolean {
                    if (value === null) {
                        return true;
                    }

                    return HEX_COLOR_REGEX.test(value);
                },
                message: "El color debe ser un hexadecimal válido.",
            },
        },
        icon: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        sortOrder: {
            type: Number,
            default: 0,
            min: 0,
        },
        isSystem: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

categorySchema.index({ workspaceId: 1, name: 1 }, { unique: true });
categorySchema.index({ workspaceId: 1, parentCategoryId: 1 });
categorySchema.index({ workspaceId: 1, type: 1 });
categorySchema.index({ workspaceId: 1, isActive: 1 });
categorySchema.index({ workspaceId: 1, isVisible: 1 });
categorySchema.index({ workspaceId: 1, sortOrder: 1 });

export type CategoryModelType = Model<CategoryDocument>;

export const CategoryModel = model<CategoryDocument, CategoryModelType>(
    "Category",
    categorySchema
);
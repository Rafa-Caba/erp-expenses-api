import { Schema, model, type Model } from "mongoose";

import type { ReportDocument } from "../types/reports.types";
import {
    REPORT_GROUP_BY_VALUES,
    REPORT_STATUS_VALUES,
    REPORT_TYPE_VALUES,
} from "../types/reports.types";

const reportFiltersSchema = new Schema(
    {
        dateFrom: {
            type: String,
            trim: true,
            default: null,
        },
        dateTo: {
            type: String,
            trim: true,
            default: null,
        },
        currency: {
            type: String,
            enum: ["MXN", "USD"],
            trim: true,
            default: null,
        },
        memberId: {
            type: String,
            trim: true,
            default: null,
        },
        categoryId: {
            type: String,
            trim: true,
            default: null,
        },
        accountId: {
            type: String,
            trim: true,
            default: null,
        },
        cardId: {
            type: String,
            trim: true,
            default: null,
        },
        includeArchived: {
            type: Boolean,
            default: null,
        },
        groupBy: {
            type: String,
            enum: REPORT_GROUP_BY_VALUES,
            trim: true,
            default: null,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

const reportSchema = new Schema<ReportDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        type: {
            type: String,
            enum: REPORT_TYPE_VALUES,
            required: true,
            trim: true,
        },
        filters: {
            type: reportFiltersSchema,
            default: null,
        },
        generatedByMemberId: {
            type: Schema.Types.ObjectId,
            ref: "WorkspaceMember",
            default: null,
        },
        fileUrl: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        status: {
            type: String,
            enum: REPORT_STATUS_VALUES,
            required: true,
            default: "pending",
            trim: true,
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
        generatedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

reportSchema.index({ workspaceId: 1, type: 1, status: 1, createdAt: -1 });
reportSchema.index({ workspaceId: 1, generatedByMemberId: 1, createdAt: -1 });
reportSchema.index({ workspaceId: 1, generatedAt: -1 });
reportSchema.index({ workspaceId: 1, isVisible: 1, createdAt: -1 });
reportSchema.index({ workspaceId: 1, name: 1 });

export type ReportModelType = Model<ReportDocument>;

export const ReportModel = model<ReportDocument, ReportModelType>(
    "Report",
    reportSchema
);
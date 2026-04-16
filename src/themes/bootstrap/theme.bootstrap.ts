// src/themes/bootstrap/theme.bootstrap.ts

import { WorkspaceSettingsModel } from "@/src/workspaceSettings/models/WorkspaceSettings.model";
import { WorkspaceModel } from "@/src/workspaces/models/Workspace.model";

import { ensureDefaultThemesForWorkspaceService } from "../services/theme.service";

export async function bootstrapThemesForAllWorkspaces(): Promise<void> {
    const workspaces = await WorkspaceModel.find().select("_id");

    for (const workspace of workspaces) {
        await ensureDefaultThemesForWorkspaceService(workspace._id);

        await WorkspaceSettingsModel.updateOne(
            {
                workspaceId: workspace._id,
                $or: [{ theme: null }, { theme: { $exists: false } }],
            },
            {
                $set: {
                    theme: "dark",
                },
            }
        );
    }
}
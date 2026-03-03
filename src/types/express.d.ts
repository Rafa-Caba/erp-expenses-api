// src/types/express.d.ts

import type { WorkspaceDoc } from "@/src/workspaces/models/Workspace.model";
import type { WorkspaceMemberDoc } from "@/src/workspaces/models/WorkspaceMember.model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };

      workspace?: WorkspaceDoc;
      workspaceMember?: WorkspaceMemberDoc;
    }
  }
}

export {};

// src/shared/models/toJson.ts

import type { Schema } from "mongoose";

export function applyToJsonTransform(schema: Schema): void {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      // Normalize Mongo _id to id
      ret.id = String(ret._id);
      delete ret._id;

      // Normalize refs if present
      // (keeps them as-is; your API layer can populate/format later)

      return ret;
    },
  });
}

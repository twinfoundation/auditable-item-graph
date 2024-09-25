// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";

/**
 * The patch operation for JSON diffs.
 */
export interface IAuditableItemGraphPatchOperation {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.PatchOperation;

	/**
	 * The operation that was performed on the item.
	 */
	patchOperation: "add" | "remove" | "replace" | "move" | "copy" | "test";

	/**
	 * The path to the object that was changed.
	 */
	patchPath: string;

	/**
	 * The path the value was copied or moved from.
	 */
	patchFrom?: string;

	/**
	 * The value to add.
	 */
	patchValue?: unknown;
}

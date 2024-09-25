// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphPatchOperation } from "./IAuditableItemGraphPatchOperation";

/**
 * Interface describing a set of updates to the vertex.
 */
export interface IAuditableItemGraphChangeset {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Changeset;

	/**
	 * The date/time of when the changeset was created.
	 */
	dateCreated: string;

	/**
	 * The user identity that created the changes.
	 */
	userIdentity: string;

	/**
	 * The patches in the changeset.
	 */
	patches: IAuditableItemGraphPatchOperation[];

	/**
	 * The hash for the changeset.
	 */
	hash: string;

	/**
	 * The signature for the changeset.
	 */
	signature: string;

	/**
	 * The immutable storage id containing the signature for the changeset.
	 */
	immutableStorageId?: string;
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphPatchOperation } from "./IAuditableItemGraphPatchOperation";

/**
 * Interface describing a set of updates to the vertex.
 */
export interface IAuditableItemGraphChangeset {
	/**
	 * The timestamp of when the changeset was created.
	 */
	created: number;

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

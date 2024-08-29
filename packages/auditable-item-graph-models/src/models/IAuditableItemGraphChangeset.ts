// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing a set of updates to the vertex.
 */
export interface IAuditableItemGraphChangeset {
	/**
	 * The timestamp of when the changeset was created.
	 */
	created: number;

	/**
	 * The identity of the user who made the changeset.
	 */
	userIdentity: string;

	/**
	 * The hash for the changeset.
	 */
	hash: string;

	/**
	 * The immutable storage id containing the signature for the changeset.
	 */
	immutableStorageId?: string;
}

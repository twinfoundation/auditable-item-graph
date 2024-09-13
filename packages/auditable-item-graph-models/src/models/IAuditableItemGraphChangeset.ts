// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphIntegrity } from "./IAuditableItemGraphIntegrity";

/**
 * Interface describing a set of updates to the vertex.
 */
export interface IAuditableItemGraphChangeset extends IAuditableItemGraphIntegrity {
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

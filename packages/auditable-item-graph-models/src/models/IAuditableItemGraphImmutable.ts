// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
/**
 * The data stored immutable for the graph.
 */
export interface IAuditableItemGraphImmutable {
	/**
	 * The signature for a specific changeset.
	 */
	signature: string;

	/**
	 * The data for the integrity check, if it is enabled.
	 */
	canonical?: string;
}

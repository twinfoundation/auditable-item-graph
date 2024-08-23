// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceConfig {
	/**
	 * The key to use for signing the graph.
	 * @default auditable-item-graph
	 */
	vaultSigningKeyId?: string;
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceConfig {
	/**
	 * The key to use for the graph.
	 * @default auditable-item-graph
	 */
	vaultKeyId?: string;

	/**
	 * Enable immutable integrity checking by storing the changes encrypted in immutable storage.
	 * This will incur additional costs and should only be enabled if you require immutable integrity checking.
	 * @default false
	 */
	enableIntegrityCheck?: boolean;

	/**
	 * The assertion method id to use for the graph.
	 * @default auditable-item-graph
	 */
	assertionMethodId?: string;
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphChange } from "@gtsc/auditable-item-graph-models";

/**
 * Context for the auditable item graph service.
 */
export interface IAuditableItemGraphServiceContext {
	/**
	 * The current timestamp.
	 */
	now: number;

	/**
	 * The identity of the user.
	 */
	identity: string;

	/**
	 * The identity of the node.
	 */
	nodeIdentity: string;

	/**
	 * The changes for the current operation.
	 */
	changes: IAuditableItemGraphChange[];
}

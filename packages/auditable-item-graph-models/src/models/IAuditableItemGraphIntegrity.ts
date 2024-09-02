// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPatchOperation } from "@gtsc/core";

/**
 * The integrity data used in credentials.
 */
export interface IAuditableItemGraphIntegrity {
	/**
	 * The user identity that created the changes.
	 */
	userIdentity: string;

	/**
	 * The patches for the integrity at this epoch.
	 */
	patches: IPatchOperation[];
}

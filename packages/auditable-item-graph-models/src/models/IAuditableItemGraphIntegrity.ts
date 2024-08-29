// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphChange } from "./IAuditableItemGraphChange";

/**
 * The integrity data used in credentials.
 */
export interface IAuditableItemGraphIntegrity {
	/**
	 * The user identity that created the changes.
	 */
	userIdentity: string;

	/**
	 * The changes.
	 */
	changes: IAuditableItemGraphChange[];
}

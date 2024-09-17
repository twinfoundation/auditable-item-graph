// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphVerificationState } from "./auditableItemGraphVerificationState";

/**
 * Interface describing an auditable item graph verification.
 */
export interface IAuditableItemGraphVerification {
	[id: string]: unknown;

	/**
	 * The epoch of the verification.
	 */
	epoch: number;

	/**
	 * The state of the verification.
	 */
	state: AuditableItemGraphVerificationState;
}

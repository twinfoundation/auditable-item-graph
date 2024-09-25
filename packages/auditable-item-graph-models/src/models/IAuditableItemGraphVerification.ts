// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { AuditableItemGraphVerificationState } from "./auditableItemGraphVerificationState";

/**
 * Interface describing an auditable item graph verification.
 */
export interface IAuditableItemGraphVerification {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Verification;

	/**
	 * The date/time of the verification.
	 */
	dateCreated: string;

	/**
	 * The state of the verification.
	 */
	state: AuditableItemGraphVerificationState;

	/**
	 * The state properties.
	 */
	stateProperties?: { [id: string]: unknown };
}

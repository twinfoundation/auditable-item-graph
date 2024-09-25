// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";

/**
 * The data stored immutably for the graph in a verifiable credential.
 */
export interface IAuditableItemGraphCredential {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Credential;

	/**
	 * The date/time of when the changeset was created.
	 */
	dateCreated: string;

	/**
	 * The user identity that created the changes.
	 */
	userIdentity: string;

	/**
	 * The signature for the changeset.
	 */
	signature: string;

	/**
	 * The signature for the changeset.
	 */
	hash: string;

	/**
	 * The integrity data for this changeset, encrypted.
	 */
	integrity?: string;
}

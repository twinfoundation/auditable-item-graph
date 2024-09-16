// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The data stored immutably for the graph in a verifiable credential.
 */
export interface IAuditableItemGraphCredential {
	/**
	 * The timestamp of when the changeset was created.
	 */
	created: number;

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

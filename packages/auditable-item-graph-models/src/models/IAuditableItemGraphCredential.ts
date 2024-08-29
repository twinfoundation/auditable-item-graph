// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The data stored immutably for the graph in a verifiable credential.
 */
export interface IAuditableItemGraphCredential {
	/**
	 * The signature for the changeset.
	 */
	signature: string;

	/**
	 * The data for the integrity check, if it is enabled, encrypted and base64 encoded.
	 */
	integrity?: string;
}

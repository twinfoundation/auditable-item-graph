// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the base properties for auditable metadata elements.
 */
export interface IAuditableItemGraphMetadataElement {
	/**
	 * The metadata to associate with the element as JSON-LD.
	 */
	metadata?: unknown;
}

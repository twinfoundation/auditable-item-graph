// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the base properties for auditable metadata elements.
 */
export interface IAuditableItemGraphMetadataElement {
	/**
	 * The schema for the metadata.
	 */
	metadataSchema?: string;

	/**
	 * The metadata to associate with the element.
	 */
	metadata?: unknown;
}

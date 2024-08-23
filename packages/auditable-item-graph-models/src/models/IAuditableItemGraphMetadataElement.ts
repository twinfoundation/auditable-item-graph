// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphProperty } from "./IAuditableItemGraphProperty";

/**
 * Interface describing the metadata properties for auditable elements.
 */
export interface IAuditableItemGraphMetadataElement {
	/**
	 * Metadata to associate with the element.
	 */
	metadata?: IAuditableItemGraphProperty[];
}

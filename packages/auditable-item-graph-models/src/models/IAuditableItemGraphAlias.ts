// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";
import type { IAuditableItemGraphMetadataElement } from "./IAuditableItemGraphMetadataElement";

/**
 * Interface describing an alias for a vertex.
 */
export interface IAuditableItemGraphAlias
	extends IAuditableItemGraphAuditedElement,
		IAuditableItemGraphMetadataElement {
	/**
	 * The format of the id in the alias.
	 */
	format?: string;
}

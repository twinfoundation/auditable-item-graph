// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";
import type { IAuditableItemGraphMetadataElement } from "./IAuditableItemGraphMetadataElement";

/**
 * Interface describing an edge between two vertices in an auditable item graph.
 */
export interface IAuditableItemGraphEdge
	extends IAuditableItemGraphAuditedElement,
		IAuditableItemGraphMetadataElement {
	/**
	 * The relationship between the two vertices.
	 */
	relationship: string;
}

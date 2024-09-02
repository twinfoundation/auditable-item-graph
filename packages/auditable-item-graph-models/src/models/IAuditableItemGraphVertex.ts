// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAlias } from "./IAuditableItemGraphAlias";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";
import type { IAuditableItemGraphChangeset } from "./IAuditableItemGraphChangeset";
import type { IAuditableItemGraphEdge } from "./IAuditableItemGraphEdge";
import type { IAuditableItemGraphMetadataElement } from "./IAuditableItemGraphMetadataElement";
import type { IAuditableItemGraphResource } from "./IAuditableItemGraphResource";

/**
 * Interface describing an auditable item graph vertex.
 */
export interface IAuditableItemGraphVertex
	extends Omit<IAuditableItemGraphAuditedElement, "deleted">,
		IAuditableItemGraphMetadataElement {
	/**
	 * The identity of the node which controls the vertex.
	 */
	nodeIdentity?: string;

	/**
	 * Alternative aliases that can be used to identify the vertex.
	 */
	aliases?: IAuditableItemGraphAlias[];

	/**
	 * The resources attached to the vertex.
	 */
	resources?: IAuditableItemGraphResource[];

	/**
	 * Edges connected to the vertex.
	 */
	edges?: IAuditableItemGraphEdge[];

	/**
	 * Changesets containing time sliced changes to the vertex.
	 */
	changesets?: IAuditableItemGraphChangeset[];
}

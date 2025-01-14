// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphAlias } from "./IAuditableItemGraphAlias";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";
import type { IAuditableItemGraphChangeset } from "./IAuditableItemGraphChangeset";
import type { IAuditableItemGraphEdge } from "./IAuditableItemGraphEdge";
import type { IAuditableItemGraphResource } from "./IAuditableItemGraphResource";

/**
 * Interface describing an auditable item graph vertex.
 */
export interface IAuditableItemGraphVertex
	extends Omit<IAuditableItemGraphAuditedElement, "deleted"> {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Vertex;

	/**
	 * The identity of the node which controls the vertex.
	 */
	nodeIdentity?: string;

	/**
	 * The JSON-LD annotation object for the vertex.
	 */
	annotationObject?: IJsonLdNodeObject;

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
	 * Changesets for the vertex.
	 */
	changesets?: IAuditableItemGraphChangeset[];

	/**
	 * Is the vertex verified, will only be populated when verification is requested.
	 */
	verified?: boolean;
}

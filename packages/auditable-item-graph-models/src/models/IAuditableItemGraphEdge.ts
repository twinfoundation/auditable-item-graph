// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";

/**
 * Interface describing an edge between two vertices in an auditable item graph.
 */
export interface IAuditableItemGraphEdge extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphContexts.ContextRoot
		| [typeof AuditableItemGraphContexts.ContextRoot, ...IJsonLdContextDefinitionElement[]];

	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Edge;

	/**
	 * The JSON-LD annotation object for the edge.
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The relationship between the two vertices.
	 */
	edgeRelationship: string;
}

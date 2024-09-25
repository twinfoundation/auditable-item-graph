// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { entity, property } from "@twin.org/entity";

/**
 * Class describing the auditable item graph edge.
 */
@entity()
export class AuditableItemGraphEdge {
	/**
	 * The id of the edge.
	 */
	@property({ type: "string" })
	public id!: string;

	/**
	 * The date/time of when the edge was created.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * The date/time of when the edge was last modified.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified?: string;

	/**
	 * The timestamp of when the edge was deleted, as we never actually remove items.
	 */
	@property({ type: "string", format: "date-time" })
	public dateDeleted?: string;

	/**
	 * The relationship between the two vertices.
	 */
	@property({ type: "string" })
	public edgeRelationship!: string;

	/**
	 * Object to associate with the edge as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject })
	public edgeObject?: IJsonLdNodeObject;
}

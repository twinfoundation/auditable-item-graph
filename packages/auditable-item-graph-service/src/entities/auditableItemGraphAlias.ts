// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { entity, property } from "@twin.org/entity";

/**
 * Class describing the auditable item graph alias.
 */
@entity()
export class AuditableItemGraphAlias {
	/**
	 * The alternative alias for the vertex.
	 */
	@property({ type: "string" })
	public id!: string;

	/**
	 * The format of the alias for the vertex.
	 */
	@property({ type: "string" })
	public aliasFormat?: string;

	/**
	 * The date/time of when the alias was created.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * The date/time of when the alias was last modified.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified?: string;

	/**
	 * The timestamp of when the alias was deleted, as we never actually remove items.
	 */
	@property({ type: "string", format: "date-time" })
	public dateDeleted?: string;

	/**
	 * Object to associate with the alias as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject })
	public annotationObject?: IJsonLdNodeObject;
}

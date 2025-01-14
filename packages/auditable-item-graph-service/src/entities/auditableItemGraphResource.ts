// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { JsonLdTypes, type IJsonLdNodeObject } from "@twin.org/data-json-ld";
import { entity, property } from "@twin.org/entity";

/**
 * Class describing the auditable item graph vertex resource.
 */
@entity()
export class AuditableItemGraphResource {
	/**
	 * The id of the resource.
	 */
	@property({ type: "string" })
	public id?: string;

	/**
	 * The date/time of when the resource was created.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * The date/time of when the resource was last modified.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified?: string;

	/**
	 * The timestamp of when the resource was deleted, as we never actually remove items.
	 */
	@property({ type: "string", format: "date-time" })
	public dateDeleted?: string;

	/**
	 * Object to associate with the resource as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: JsonLdTypes.NodeObject })
	public resourceObject?: IJsonLdNodeObject;
}

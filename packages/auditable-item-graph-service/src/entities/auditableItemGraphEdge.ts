// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@gtsc/data-json-ld";
import { entity, property } from "@gtsc/entity";

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
	 * The timestamp of when the edge was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The timestamp of when the edge was deleted, as we never actually remove items.
	 */
	@property({ type: "number" })
	public deleted?: number;

	/**
	 * The relationship between the two vertices.
	 */
	@property({ type: "string" })
	public relationship!: string;

	/**
	 * Metadata to associate with the edge as JSON-LD.
	 */
	@property({ type: "object", itemTypeRef: "IJsonLdNodeObject" })
	public metadata?: IJsonLdNodeObject;
}

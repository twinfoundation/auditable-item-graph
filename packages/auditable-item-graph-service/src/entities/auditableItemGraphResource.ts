// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";
import type { AuditableItemGraphProperty } from "./auditableItemGraphProperty";

/**
 * Class describing the auditable item graph vertex resource.
 */
@entity()
export class AuditableItemGraphResource {
	/**
	 * The id of the vertex.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The timestamp of when the vertex was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The timestamp of when the resource was deleted, as we never actually remove items.
	 */
	@property({ type: "number" })
	public deleted?: number;

	/**
	 * Metadata to associate with the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphProperty[]" })
	public metadata?: AuditableItemGraphProperty[];
}

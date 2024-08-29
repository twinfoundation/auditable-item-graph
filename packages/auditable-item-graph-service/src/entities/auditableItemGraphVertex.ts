// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";
import type { AuditableItemGraphAlias } from "./auditableItemGraphAlias";
import type { AuditableItemGraphChangeset } from "./auditableItemGraphChangeset";
import type { AuditableItemGraphEdge } from "./auditableItemGraphEdge";
import type { AuditableItemGraphProperty } from "./auditableItemGraphProperty";
import type { AuditableItemGraphResource } from "./auditableItemGraphResource";

/**
 * Class describing the auditable item graph vertex.
 */
@entity()
export class AuditableItemGraphVertex {
	/**
	 * The id of the vertex.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The identity of the node which controls the vertex.
	 */
	@property({ type: "string" })
	public nodeIdentity?: string;

	/**
	 * The timestamp of when the vertex was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * Combined alias index for the vertex used for querying.
	 */
	@property({ type: "string" })
	public aliasIndex?: string;

	/**
	 * Alternative aliases that can be used to identify the vertex.
	 */
	@property({ type: "array", itemType: "string" })
	public aliases?: AuditableItemGraphAlias[];

	/**
	 * Metadata to associate with the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphProperty[]" })
	public metadata?: AuditableItemGraphProperty[];

	/**
	 * The resources attached to the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphResource" })
	public resources?: AuditableItemGraphResource[];

	/**
	 * Edges connected to the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphEdge" })
	public edges?: AuditableItemGraphEdge[];

	/**
	 * Changesets containing time sliced changes to the vertex.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphChange" })
	public changesets?: AuditableItemGraphChangeset[];
}

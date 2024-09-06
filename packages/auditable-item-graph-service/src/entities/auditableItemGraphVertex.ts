// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@gtsc/entity";
import type { AuditableItemGraphAlias } from "./auditableItemGraphAlias";
import type { AuditableItemGraphEdge } from "./auditableItemGraphEdge";
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
	@property({ type: "number", sortDirection: SortDirection.Descending })
	public created!: number;

	/**
	 * The timestamp of when the vertex was last updated.
	 */
	@property({ type: "number", sortDirection: SortDirection.Descending })
	public updated?: number;

	/**
	 * Combined alias index for the vertex used for querying.
	 */
	@property({ type: "string", isSecondary: true })
	public aliasIndex?: string;

	/**
	 * Metadata to associate with the vertex as JSON-LD.
	 */
	@property({ type: "object" })
	public metadata?: unknown;

	/**
	 * Alternative aliases that can be used to identify the vertex.
	 */
	@property({ type: "array", itemType: "string" })
	public aliases?: AuditableItemGraphAlias[];

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
}

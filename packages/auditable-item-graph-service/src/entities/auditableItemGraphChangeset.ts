// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@twin.org/entity";
import type { AuditableItemGraphPatch } from "./auditableItemGraphPatch";

/**
 * Class describing a set of updates to the vertex.
 */
@entity()
export class AuditableItemGraphChangeset {
	/**
	 * The id of the changeset.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The vertex the changeset belongs to.
	 */
	@property({ type: "string", isSecondary: true })
	public vertexId!: string;

	/**
	 * The date/time of when the changeset was created.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateCreated!: string;

	/**
	 * The identity of the user who made the changeset.
	 */
	@property({ type: "string" })
	public userIdentity!: string;

	/**
	 * The patches in the changeset.
	 */
	@property({ type: "array", itemTypeRef: "AuditableItemGraphPatch" })
	public patches!: AuditableItemGraphPatch[];

	/**
	 * The immutable proof id which contains the signature for this changeset.
	 */
	@property({ type: "string", optional: true })
	public proofId?: string;
}

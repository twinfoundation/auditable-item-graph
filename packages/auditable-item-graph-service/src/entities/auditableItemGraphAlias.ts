// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";

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
	 * The timestamp of when the alias was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The timestamp of when the alias was deleted, as we never actually remove items.
	 */
	@property({ type: "number" })
	public deleted?: number;

	/**
	 * Metadata to associate with the alias as JSON-LD.
	 */
	@property({ type: "object" })
	public metadata?: unknown;
}

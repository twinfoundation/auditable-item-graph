// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@gtsc/entity";

/**
 * Class representing property in an auditable item graph.
 */
@entity()
export class AuditableItemGraphProperty {
	/**
	 * The id of the property.
	 */
	@property({ type: "string" })
	public id!: string;

	/**
	 * The timestamp of when the property was created.
	 */
	@property({ type: "number" })
	public created!: number;

	/**
	 * The timestamp of when the property was deleted, as we never actually remove items.
	 */
	@property({ type: "number" })
	public deleted?: number;

	/**
	 * Is type of the item.
	 */
	@property({ type: "string" })
	public type!: string;

	/**
	 * The value for the item.
	 */
	@property({ type: "object" })
	public value!: unknown;
}

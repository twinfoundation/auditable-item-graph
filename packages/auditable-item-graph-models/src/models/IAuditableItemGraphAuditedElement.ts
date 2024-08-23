// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing the base properties for auditable elements.
 */
export interface IAuditableItemGraphAuditedElement {
	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * The timestamp of when the element was created.
	 */
	created: number;

	/**
	 * The timestamp of when the element was deleted, as we never actually remove items.
	 * A property can also be marked as deleted if the value was updated, in which case
	 * a new value is created and the old one marked as deleted.
	 */
	deleted?: number;
}

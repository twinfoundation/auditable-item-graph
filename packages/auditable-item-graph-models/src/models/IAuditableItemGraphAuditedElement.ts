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
	 * The timestamp of when the element was updated.
	 */
	updated?: number;

	/**
	 * The timestamp of when the element was deleted, as we never actually remove items.
	 */
	deleted?: number;
}

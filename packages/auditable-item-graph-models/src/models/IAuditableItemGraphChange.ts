// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface describing a change in a property.
 */
export interface IAuditableItemGraphChange {
	/**
	 * Which item type was changed.
	 */
	itemType: string;

	/**
	 * Which item is the parent of this change.
	 */
	parentId?: string;

	/**
	 * The operation that was performed on the item.
	 */
	operation: "add" | "delete";

	/**
	 * The data in the item that was changed.
	 */
	changed: { [id: string]: unknown };
}

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
	 * The properties from the modified object.
	 */
	properties: { [id: string]: unknown };
}

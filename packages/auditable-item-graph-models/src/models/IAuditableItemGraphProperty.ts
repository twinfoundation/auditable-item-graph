// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";

/**
 * Interface describing a property for vertex metadata.
 */
export interface IAuditableItemGraphProperty extends IAuditableItemGraphAuditedElement {
	/**
	 * The type of the property.
	 */
	type: string;

	/**
	 * The value of the property.
	 */
	value: unknown;
}

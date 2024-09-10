// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@gtsc/data-json-ld";

/**
 * Interface describing the base properties for auditable metadata elements.
 */
export interface IAuditableItemGraphMetadataElement {
	/**
	 * The metadata to associate with the element as JSON-LD.
	 */
	metadata?: IJsonLdNodeObject;
}

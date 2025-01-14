// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";

/**
 * Interface describing an alias for a vertex.
 */
export interface IAuditableItemGraphAlias extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...string[]];

	/**
	 * The id of the element.
	 */
	id: string;

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Alias;

	/**
	 * The JSON-LD annotation object for the alias.
	 */
	annotationObject?: IJsonLdNodeObject;

	/**
	 * The format of the id in the alias.
	 */
	aliasFormat?: string;
}

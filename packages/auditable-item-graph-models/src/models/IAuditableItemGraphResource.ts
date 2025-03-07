// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement, IJsonLdNodeObject } from "@twin.org/data-json-ld";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphAuditedElement } from "./IAuditableItemGraphAuditedElement";

/**
 * Interface describing an auditable item graph vertex resource.
 */
export interface IAuditableItemGraphResource extends IAuditableItemGraphAuditedElement {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphContexts.ContextRoot
		| [typeof AuditableItemGraphContexts.ContextRoot, ...IJsonLdContextDefinitionElement[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.Resource;

	/**
	 * The JSON-LD object for the resource.
	 */
	resourceObject?: IJsonLdNodeObject;
}

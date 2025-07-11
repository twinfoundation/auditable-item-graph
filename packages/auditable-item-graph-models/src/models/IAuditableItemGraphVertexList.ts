// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { SchemaOrgContexts, SchemaOrgTypes } from "@twin.org/standards-schema-org";
import type { AuditableItemGraphContexts } from "./auditableItemGraphContexts";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";

/**
 * Interface describing an auditable item graph vertex list.
 */
export interface IAuditableItemGraphVertexList {
	/**
	 * JSON-LD Context.
	 */
	"@context": [
		typeof SchemaOrgContexts.ContextRoot,
		typeof AuditableItemGraphContexts.ContextRoot,
		...IJsonLdContextDefinitionElement[]
	];

	/**
	 * JSON-LD Type.
	 */
	type: [typeof SchemaOrgTypes.ItemList, typeof AuditableItemGraphTypes.VertexList];

	/**
	 * The list of vertices.
	 */
	[SchemaOrgTypes.ItemListElement]: IAuditableItemGraphVertex[];

	/**
	 * The cursor to get the next chunk of vertices.
	 */
	[SchemaOrgTypes.NextItem]?: string;
}

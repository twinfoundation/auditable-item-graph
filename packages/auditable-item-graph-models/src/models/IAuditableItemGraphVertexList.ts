// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdContextDefinitionElement } from "@twin.org/data-json-ld";
import type { AuditableItemGraphTypes } from "./auditableItemGraphTypes";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";

/**
 * Interface describing an auditable item graph vertex list.
 */
export interface IAuditableItemGraphVertexList {
	/**
	 * JSON-LD Context.
	 */
	"@context":
		| typeof AuditableItemGraphTypes.ContextRoot
		| [typeof AuditableItemGraphTypes.ContextRoot, ...IJsonLdContextDefinitionElement[]];

	/**
	 * JSON-LD Type.
	 */
	type: typeof AuditableItemGraphTypes.VertexList;

	/**
	 * The list of vertices.
	 */
	vertices: IAuditableItemGraphVertex[];

	/**
	 * The cursor to get the next chunk of vertices.
	 */
	cursor?: string;
}

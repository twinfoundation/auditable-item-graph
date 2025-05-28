// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@twin.org/data-core";
import type { JSONSchema7 } from "json-schema";
import { AuditableItemGraphContexts } from "../models/auditableItemGraphContexts";
import { AuditableItemGraphTypes } from "../models/auditableItemGraphTypes";
import AuditableItemGraphAliasSchema from "../schemas/AuditableItemGraphAlias.json";
import AuditableItemGraphChangesetSchema from "../schemas/AuditableItemGraphChangeset.json";
import AuditableItemGraphEdgeSchema from "../schemas/AuditableItemGraphEdge.json";
import AuditableItemGraphPatchOperationSchema from "../schemas/AuditableItemGraphPatchOperation.json";
import AuditableItemGraphResourceSchema from "../schemas/AuditableItemGraphResource.json";
import AuditableItemGraphVertexSchema from "../schemas/AuditableItemGraphVertex.json";

/**
 * Handle all the data types for auditable item graph.
 */
export class AuditableItemGraphDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.Vertex}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Vertex,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphVertexSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.Alias}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Alias,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphAliasSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.Resource}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Resource,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphResourceSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.Edge}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Edge,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphEdgeSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.Changeset}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.Changeset,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphChangesetSchema as JSONSchema7
			})
		);
		DataTypeHandlerFactory.register(
			`${AuditableItemGraphContexts.ContextRoot}${AuditableItemGraphTypes.PatchOperation}`,
			() => ({
				context: AuditableItemGraphContexts.ContextRoot,
				type: AuditableItemGraphTypes.PatchOperation,
				defaultValue: {},
				jsonSchema: async () => AuditableItemGraphPatchOperationSchema as JSONSchema7
			})
		);
	}
}

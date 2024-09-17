// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { DataTypeHandlerFactory } from "@gtsc/data-core";
import type { JSONSchema7 } from "json-schema";
import { AuditableItemGraphTypes } from "../models/auditableItemGraphTypes";
import AuditableItemGraphAliasSchema from "../schemas/AuditableItemGraphAlias.json";
import AuditableItemGraphChangesetSchema from "../schemas/AuditableItemGraphChangeset.json";
import AuditableItemGraphCredentialSchema from "../schemas/AuditableItemGraphCredential.json";
import AuditableItemGraphEdgeSchema from "../schemas/AuditableItemGraphEdge.json";
import AuditableItemGraphPatchOperationSchema from "../schemas/AuditableItemGraphPatchOperation.json";
import AuditableItemGraphResourceSchema from "../schemas/AuditableItemGraphResource.json";
import AuditableItemGraphVerificationSchema from "../schemas/AuditableItemGraphVerification.json";
import AuditableItemGraphVerificationStateSchema from "../schemas/AuditableItemGraphVerificationState.json";
import AuditableItemGraphVertexSchema from "../schemas/AuditableItemGraphVertex.json";
/**
 * Handle all the data types for auditable item graph.
 */
export class AuditableItemGraphDataTypes {
	/**
	 * Register all the data types.
	 */
	public static registerTypes(): void {
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Vertex, () => ({
			type: AuditableItemGraphTypes.Vertex,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphVertexSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Alias, () => ({
			type: AuditableItemGraphTypes.Alias,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphAliasSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Resource, () => ({
			type: AuditableItemGraphTypes.Resource,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphResourceSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Edge, () => ({
			type: AuditableItemGraphTypes.Edge,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphEdgeSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Changeset, () => ({
			type: AuditableItemGraphTypes.Changeset,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphChangesetSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.PatchOperation, () => ({
			type: AuditableItemGraphTypes.PatchOperation,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphPatchOperationSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Credential, () => ({
			type: AuditableItemGraphTypes.Credential,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphCredentialSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.Verification, () => ({
			type: AuditableItemGraphTypes.Verification,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphVerificationSchema as JSONSchema7
		}));
		DataTypeHandlerFactory.register(AuditableItemGraphTypes.VerificationState, () => ({
			type: AuditableItemGraphTypes.VerificationState,
			defaultValue: {},
			jsonSchema: async () => AuditableItemGraphVerificationStateSchema as JSONSchema7
		}));
	}
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of auditable item graph data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphTypes = {
	/**
	 * The context root for the auditable item graph types.
	 */
	ContextRoot: "https://schema.twindev.org/aig/",

	/**
	 * Represents auditable item graph vertex.
	 */
	Vertex: "AuditableItemGraphVertex",

	/**
	 * Represents auditable item graph alias.
	 */
	Alias: "AuditableItemGraphAlias",

	/**
	 * Represents auditable item graph resource.
	 */
	Resource: "AuditableItemGraphResource",

	/**
	 * Represents auditable item graph edge.
	 */
	Edge: "AuditableItemGraphEdge",

	/**
	 * Represents auditable item graph  changeset.
	 */
	Changeset: "AuditableItemGraphChangeset",

	/**
	 * Represents patch operation.
	 */
	PatchOperation: "AuditableItemGraphPatchOperation",

	/**
	 * Represents the immutable credential payload.
	 */
	Credential: "AuditableItemGraphPatchCredential",

	/**
	 * Represents auditable item stream verification.
	 */
	Verification: "AuditableItemGraphVerification",

	/**
	 * Represents auditable item stream verification state.
	 */
	VerificationState: "AuditableItemGraphVerificationState",

	/**
	 * Represents auditable item stream vertex list.
	 */
	VertexList: "AuditableItemGraphVertexList"
} as const;

/**
 * The types of auditable item graph data.
 */
export type AuditableItemGraphTypes =
	(typeof AuditableItemGraphTypes)[keyof typeof AuditableItemGraphTypes];

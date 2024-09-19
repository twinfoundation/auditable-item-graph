// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of auditable item graph data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphTypes = {
	/**
	 * The context uri for the auditable item graph types.
	 */
	ContextUri: "https://schema.twindev.org/aig/",

	/**
	 * The context root for the auditable item graph types.
	 */
	ContextJsonld: "https://schema.twindev.org/aig/types.jsonld",

	/**
	 * Represents auditable item graph vertex.
	 */
	Vertex: "https://schema.twindev.org/aig/AuditableItemGraphVertex",

	/**
	 * Represents auditable item graph alias.
	 */
	Alias: "https://schema.twindev.org/aig/AuditableItemGraphAlias",

	/**
	 * Represents auditable item graph resource.
	 */
	Resource: "https://schema.twindev.org/aig/AuditableItemGraphResource",

	/**
	 * Represents auditable item graph edge.
	 */
	Edge: "https://schema.twindev.org/aig/AuditableItemGraphEdge",

	/**
	 * Represents auditable item graph  changeset.
	 */
	Changeset: "https://schema.twindev.org/aig/AuditableItemGraphChangeset",

	/**
	 * Represents patch operation.
	 */
	PatchOperation: "https://schema.twindev.org/aig/AuditableItemGraphPatchOperation",

	/**
	 * Represents the immutable credential payload.
	 */
	Credential: "https://schema.twindev.org/aig/AuditableItemGraphPatchCredential",

	/**
	 * Represents auditable item stream verification.
	 */
	Verification: "https://schema.twindev.org/aig/AuditableItemGraphVerification",

	/**
	 * Represents auditable item stream verification state.
	 */
	VerificationState: "https://schema.twindev.org/aig/AuditableItemGraphVerificationState"
} as const;

/**
 * The types of auditable item graph data.
 */
export type AuditableItemGraphTypes =
	(typeof AuditableItemGraphTypes)[keyof typeof AuditableItemGraphTypes];

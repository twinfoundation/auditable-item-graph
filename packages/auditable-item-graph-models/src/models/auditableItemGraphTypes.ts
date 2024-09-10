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
	Context: "https://schema.gtsc.io/v2/types.jsonld",

	/**
	 * Represents auditable item graph vertex.
	 */
	Vertex: "https://schema.gtsc.io/v2/AuditableItemGraphVertex",

	/**
	 * Represents auditable item graph alias.
	 */
	Alias: "https://schema.gtsc.io/v2/AuditableItemGraphAlias",

	/**
	 * Represents auditable item graph resource.
	 */
	Resource: "https://schema.gtsc.io/v2/AuditableItemGraphResource",

	/**
	 * Represents auditable item graph edge.
	 */
	Edge: "https://schema.gtsc.io/v2/AuditableItemGraphEdge",

	/**
	 * Represents auditable item graph  changeset.
	 */
	Changeset: "https://schema.gtsc.io/v2/AuditableItemGraphChangeset",

	/**
	 * Represents patch operation.
	 */
	PatchOperation: "https://schema.gtsc.io/v2/AuditableItemGraphPatchOperation"
} as const;

/**
 * The types of auditable item graph data.
 */
export type AuditableItemGraphTypes =
	(typeof AuditableItemGraphTypes)[keyof typeof AuditableItemGraphTypes];

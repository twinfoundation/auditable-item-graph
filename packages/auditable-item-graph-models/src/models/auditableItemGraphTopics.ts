// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The topics for auditable item graph event bus notifications.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphTopics = {
	/**
	 * A vertex was created.
	 */
	VertexCreated: "auditable-item-graph:vertex-created",

	/**
	 * A vertex was updated.
	 */
	VertexUpdated: "auditable-item-graph:vertex-updated"
} as const;

/**
 * The topics for auditable item graph event bus notifications.
 */
export type AuditableItemGraphTopics =
	(typeof AuditableItemGraphTopics)[keyof typeof AuditableItemGraphTopics];

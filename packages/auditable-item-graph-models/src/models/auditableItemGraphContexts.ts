// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The contexts of auditable item graph data.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuditableItemGraphContexts = {
	/**
	 * The context root for the auditable item graph types.
	 */
	ContextRoot: "https://schema.twindev.org/aig/",

	/**
	 * The context root for the common types.
	 */
	ContextRootCommon: "https://schema.twindev.org/common/"
} as const;

/**
 * The contexts of auditable item graph data.
 */
export type AuditableItemGraphContexts =
	(typeof AuditableItemGraphContexts)[keyof typeof AuditableItemGraphContexts];

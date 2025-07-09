// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuditableItemGraphServiceConfig } from "./IAuditableItemGraphServiceConfig";

/**
 * Options for the constructor of the auditable item graph service.
 */
export interface IAuditableItemGraphServiceConstructorOptions {
	/**
	 * The immutable proof component type.
	 * @default immutable-proof
	 */
	immutableProofComponentType?: string;

	/**
	 * The entity storage for vertices.
	 * @default auditable-item-graph-vertex
	 */
	vertexEntityStorageType?: string;

	/**
	 * The entity storage for changesets.
	 * @default auditable-item-graph-changeset
	 */
	changesetEntityStorageType?: string;

	/**
	 * The event bus component type, defaults to no event bus.
	 */
	eventBusComponentType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IAuditableItemGraphServiceConfig;
}

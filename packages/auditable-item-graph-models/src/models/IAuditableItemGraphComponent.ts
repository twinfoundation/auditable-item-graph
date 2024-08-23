// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@gtsc/core";
import type { IProperty } from "@gtsc/schema";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";

/**
 * Interface describing an auditable item graph contract.
 */
export interface IAuditableItemGraphComponent extends IComponent {
	/**
	 * Create a new graph vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new graph item.
	 */
	create(
		aliases?: string[],
		metadata?: IProperty[],
		identity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted aliases, resource, edges, defaults to false.
	 * @param options.includeChangesets Whether to include the changesets of the vertex, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			includeChangesets?: boolean;
			verifySignatureDepth?: "none" | "current" | "all";
		}
	): Promise<IAuditableItemGraphVertex>;
}

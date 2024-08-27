// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@gtsc/core";
import type { IProperty } from "@gtsc/schema";
import type { IAuditableItemGraphChange } from "./IAuditableItemGraphChange";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";

/**
 * Interface describing an auditable item graph contract.
 */
export interface IAuditableItemGraphComponent extends IComponent {
	/**
	 * Create a new graph vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new graph item.
	 */
	create(
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[],
		metadata?: IProperty[],
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[],
		identity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	update(
		id: string,
		aliases?: {
			id: string;
			metadata?: IProperty[];
		}[],
		metadata?: IProperty[],
		resources?: {
			id: string;
			metadata?: IProperty[];
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IProperty[];
		}[],
		identity?: string,
		nodeIdentity?: string
	): Promise<void>;

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
	): Promise<{
		verified?: boolean;
		verification?: {
			[epoch: number]: {
				failure?: string;
				properties?: { [id: string]: unknown };
				changes: IAuditableItemGraphChange[];
			};
		};
		vertex: IAuditableItemGraphVertex;
	}>;
}

// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@gtsc/core";
import type { IProperty } from "@gtsc/schema";
import type { IAuditableItemGraphChange } from "./IAuditableItemGraphChange";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";
import type { VerifyDepth } from "./verifyDepth";

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
			verifySignatureDepth?: VerifyDepth;
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

	/**
	 * Remove the immutable storage for an item.
	 * @param id The id of the vertex to get.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeImmutable(id: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Query the graph for vertices with the matching id or alias.
	 * @param idOrAlias The id or alias to query for.
	 * @param mode Look in id, alias or both, defaults to both.
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		idOrAlias: string,
		mode?: "id" | "alias" | "both",
		properties?: (keyof IAuditableItemGraphVertex)[],
		cursor?: string,
		pageSize?: number
	): Promise<{
		/**
		 * The entities, which can be partial if a limited keys list was provided.
		 */
		entities: Partial<IAuditableItemGraphVertex>[];
		/**
		 * An optional cursor, when defined can be used to call find to get more entities.
		 */
		cursor?: string;
		/**
		 * Number of entities to return.
		 */
		pageSize?: number;
		/**
		 * Total entities length.
		 */
		totalEntities: number;
	}>;
}

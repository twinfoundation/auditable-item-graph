// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@gtsc/core";
import type { IJsonLdDocument, IJsonLdNodeObject } from "@gtsc/data-json-ld";
import type { SortDirection } from "@gtsc/entity";
import type { MimeTypes } from "@gtsc/web";
import type { IAuditableItemGraphVertex } from "./IAuditableItemGraphVertex";
import type { VerifyDepth } from "./verifyDepth";

/**
 * Interface describing an auditable item graph contract.
 */
export interface IAuditableItemGraphComponent extends IComponent {
	/**
	 * Create a new graph vertex.
	 * @param metadata The metadata for the vertex as JSON-LD.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns The id of the new graph item.
	 */
	create(
		metadata?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
		}[],
		identity?: string,
		nodeIdentity?: string
	): Promise<string>;

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param metadata The metadata for the vertex as JSON-LD.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @param identity The identity to create the auditable item graph operation with.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 */
	update(
		id: string,
		metadata?: IJsonLdNodeObject,
		aliases?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		resources?: {
			id: string;
			metadata?: IJsonLdNodeObject;
		}[],
		edges?: {
			id: string;
			relationship: string;
			metadata?: IJsonLdNodeObject;
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
	 * @param responseType The response type to return, defaults to application/json.
	 * @returns The vertex if found.
	 * @throws NotFoundError if the vertex is not found.
	 */
	get(
		id: string,
		options?: {
			includeDeleted?: boolean;
			includeChangesets?: boolean;
			verifySignatureDepth?: VerifyDepth;
		},
		// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
		responseType?: typeof MimeTypes.Json | typeof MimeTypes.JsonLd
	): Promise<
		(IAuditableItemGraphVertex | IJsonLdDocument) & {
			verified?: boolean;
			verification?: {
				created: number;
				failure?: string;
				failureProperties?: { [id: string]: unknown };
			}[];
		}
	>;

	/**
	 * Remove the immutable storage for an item.
	 * @param id The id of the vertex to get.
	 * @param nodeIdentity The node identity to use for vault operations.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	removeImmutable(id: string, nodeIdentity?: string): Promise<void>;

	/**
	 * Query the graph for vertices.
	 * @param options The query options.
	 * @param options.id The optional id to look for.
	 * @param options.idMode Look in id, alias or both, defaults to both.
	 * @param orderBy The order for the results, defaults to created.
	 * @param orderByDirection The direction for the order, defaults to descending.
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	query(
		options?: {
			id?: string;
			idMode?: "id" | "alias" | "both";
		},
		orderBy?: "created" | "updated",
		orderByDirection?: SortDirection,
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
	}>;
}

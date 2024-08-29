// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@gtsc/api-core";
import type { IBaseRestClientConfig, ICreatedResponse, INoContentResponse } from "@gtsc/api-models";
import type {
	IAuditableItemGraphChange,
	IAuditableItemGraphComponent,
	IAuditableItemGraphCreateRequest,
	IAuditableItemGraphGetRequest,
	IAuditableItemGraphGetResponse,
	IAuditableItemGraphListRequest,
	IAuditableItemGraphListResponse,
	IAuditableItemGraphUpdateRequest,
	IAuditableItemGraphVertex,
	VerifyDepth
} from "@gtsc/auditable-item-graph-models";
import { Guards, NotSupportedError } from "@gtsc/core";
import { nameof } from "@gtsc/nameof";
import type { IProperty } from "@gtsc/schema";

/**
 * Client for performing auditable item graph through to REST endpoints.
 */
export class AuditableItemGraphClient
	extends BaseRestClient
	implements IAuditableItemGraphComponent
{
	/**
	 * Runtime name for the class.
	 */
	public readonly CLASS_NAME: string = nameof<AuditableItemGraphClient>();

	/**
	 * Create a new instance of AuditableItemGraphClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<AuditableItemGraphClient>(), config, "auditable-item-graph");
	}

	/**
	 * Create a new graph vertex.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @returns The id of the new graph item.
	 */
	public async create(
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
		}[]
	): Promise<string> {
		const response = await this.fetch<IAuditableItemGraphCreateRequest, ICreatedResponse>(
			"/",
			"POST",
			{
				body: {
					aliases,
					metadata,
					resources,
					edges
				}
			}
		);

		return response.headers.location;
	}

	/**
	 * Get a graph vertex.
	 * @param id The id of the vertex to get.
	 * @returns The vertex if found.
	 * @param options Additional options for the get operation.
	 * @param options.includeDeleted Whether to include deleted aliases, resource, edges, defaults to false.
	 * @param options.includeChangesets Whether to include the changesets of the vertex, defaults to false.
	 * @param options.verifySignatureDepth How many signatures to verify, defaults to "none".
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async get(
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
	}> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IAuditableItemGraphGetRequest,
			IAuditableItemGraphGetResponse
		>("/:id", "GET", {
			pathParams: {
				id
			},
			query: options
		});

		return response.body;
	}

	/**
	 * Update a graph vertex.
	 * @param id The id of the vertex to update.
	 * @param aliases Alternative aliases that can be used to identify the vertex.
	 * @param metadata The metadata for the vertex.
	 * @param resources The resources attached to the vertex.
	 * @param edges The edges connected to the vertex.
	 * @returns Nothing.
	 */
	public async update(
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
		}[]
	): Promise<void> {
		Guards.stringValue(this.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditableItemGraphUpdateRequest, INoContentResponse>("/:id", "PUT", {
			pathParams: {
				id
			},
			body: {
				aliases,
				metadata,
				resources,
				edges
			}
		});
	}

	/**
	 * Remove the immutable storage for an item.
	 * @param id The id of the vertex to get.
	 * @returns Nothing.
	 * @throws NotFoundError if the vertex is not found.
	 */
	public async removeImmutable(id: string): Promise<void> {
		throw new NotSupportedError(this.CLASS_NAME, "removeImmutable");
	}

	/**
	 * Query the graph for vertices with the matching id or alias.
	 * @param idOrAlias The id or alias to query for.
	 * @param mode Look in id, alias or both, defaults to both.
	 * @param properties The properties to return, if not provided defaults to id, created, aliases and metadata.
	 * @param cursor The cursor to request the next page of entities.
	 * @param pageSize The maximum number of entities in a page.
	 * @returns The entities, which can be partial if a limited keys list was provided.
	 */
	public async query(
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
	}> {
		const response = await this.fetch<
			IAuditableItemGraphListRequest,
			IAuditableItemGraphListResponse
		>("/", "GET", {
			query: {
				idOrAlias,
				mode,
				properties: properties?.join(","),
				cursor,
				pageSize
			}
		});

		return response.body;
	}
}
